use crate::db::DbPool;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use ring::aead::{Aad, LessSafeKey, Nonce, UnboundKey, AES_256_GCM};
use ring::rand::{SecureRandom, SystemRandom};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::State;

/// Encryption key length for AES-256-GCM.
const KEY_LEN: usize = 32;
/// Nonce length for AES-256-GCM.
const NONCE_LEN: usize = 12;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EnvVar {
    pub key: String,
    pub value: String,
}

#[allow(dead_code)] // Exposed for future API use
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EncryptedEnvVar {
    pub key: String,
    pub encrypted_value: String, // base64(nonce || ciphertext)
}

/// Get or create the encryption key for a repo, stored in conductor_config JSON.
async fn get_or_create_key(repo_id: &str, pool: &sqlx::SqlitePool) -> Result<Vec<u8>, String> {
    let config: Option<String> =
        sqlx::query_scalar("SELECT conductor_config FROM repos WHERE id = ?")
            .bind(repo_id)
            .fetch_one(pool)
            .await
            .map_err(|e| e.to_string())?;

    if let Some(config_str) = config {
        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&config_str) {
            if let Some(key_b64) = parsed.get("env_key").and_then(|v| v.as_str()) {
                return BASE64.decode(key_b64).map_err(|e| e.to_string());
            }
        }
    }

    // Generate new key
    let rng = SystemRandom::new();
    let mut key = vec![0u8; KEY_LEN];
    rng.fill(&mut key).map_err(|e| e.to_string())?;

    // Store key in conductor_config
    let config_val = serde_json::json!({
        "env_key": BASE64.encode(&key),
    });
    sqlx::query("UPDATE repos SET conductor_config = ? WHERE id = ?")
        .bind(config_val.to_string())
        .bind(repo_id)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(key)
}

fn encrypt_value(key: &[u8], plaintext: &str) -> Result<String, String> {
    let rng = SystemRandom::new();
    let unbound = UnboundKey::new(&AES_256_GCM, key).map_err(|e| e.to_string())?;
    let sealing_key = LessSafeKey::new(unbound);

    let mut nonce_bytes = [0u8; NONCE_LEN];
    rng.fill(&mut nonce_bytes).map_err(|e| e.to_string())?;
    let nonce = Nonce::assume_unique_for_key(nonce_bytes);

    let mut in_out = plaintext.as_bytes().to_vec();
    sealing_key
        .seal_in_place_append_tag(nonce, Aad::empty(), &mut in_out)
        .map_err(|e| e.to_string())?;

    // Prepend nonce to ciphertext
    let mut result = nonce_bytes.to_vec();
    result.extend_from_slice(&in_out);
    Ok(BASE64.encode(&result))
}

fn decrypt_value(key: &[u8], encrypted_b64: &str) -> Result<String, String> {
    let data = BASE64.decode(encrypted_b64).map_err(|e| e.to_string())?;
    if data.len() < NONCE_LEN {
        return Err("Invalid encrypted data".to_string());
    }

    let (nonce_bytes, ciphertext) = data.split_at(NONCE_LEN);
    let nonce_arr: [u8; NONCE_LEN] = nonce_bytes.try_into().map_err(|_| "Invalid nonce")?;
    let nonce = Nonce::assume_unique_for_key(nonce_arr);

    let unbound = UnboundKey::new(&AES_256_GCM, key).map_err(|e| e.to_string())?;
    let opening_key = LessSafeKey::new(unbound);

    let mut in_out = ciphertext.to_vec();
    let plaintext = opening_key
        .open_in_place(nonce, Aad::empty(), &mut in_out)
        .map_err(|e| e.to_string())?;

    String::from_utf8(plaintext.to_vec()).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn set_env_var(
    repo_id: String,
    key: String,
    value: String,
    db: State<'_, DbPool>,
) -> Result<(), String> {
    let enc_key = get_or_create_key(&repo_id, &db.0).await?;
    let encrypted = encrypt_value(&enc_key, &value)?;

    // Store in env_vars table or conductor_config JSON
    // Using conductor_config JSON field for simplicity
    let config: Option<String> =
        sqlx::query_scalar("SELECT conductor_config FROM repos WHERE id = ?")
            .bind(&repo_id)
            .fetch_one(&db.0)
            .await
            .map_err(|e| e.to_string())?;

    let mut parsed: serde_json::Value = config
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_else(|| serde_json::json!({}));

    let env_vars = parsed
        .as_object_mut()
        .ok_or("Invalid config")?
        .entry("env_vars")
        .or_insert_with(|| serde_json::json!({}));

    env_vars
        .as_object_mut()
        .ok_or("Invalid env_vars")?
        .insert(key, serde_json::Value::String(encrypted));

    sqlx::query("UPDATE repos SET conductor_config = ? WHERE id = ?")
        .bind(parsed.to_string())
        .bind(&repo_id)
        .execute(&db.0)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn get_env_vars(
    repo_id: String,
    db: State<'_, DbPool>,
) -> Result<Vec<EnvVar>, String> {
    let enc_key = get_or_create_key(&repo_id, &db.0).await?;

    let config: Option<String> =
        sqlx::query_scalar("SELECT conductor_config FROM repos WHERE id = ?")
            .bind(&repo_id)
            .fetch_one(&db.0)
            .await
            .map_err(|e| e.to_string())?;

    let parsed: serde_json::Value = config
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_else(|| serde_json::json!({}));

    let mut vars = Vec::new();

    if let Some(env_obj) = parsed.get("env_vars").and_then(|v| v.as_object()) {
        for (key, val) in env_obj {
            if let Some(encrypted_str) = val.as_str() {
                match decrypt_value(&enc_key, encrypted_str) {
                    Ok(decrypted) => vars.push(EnvVar {
                        key: key.clone(),
                        value: decrypted,
                    }),
                    Err(_) => vars.push(EnvVar {
                        key: key.clone(),
                        value: "***DECRYPTION_ERROR***".to_string(),
                    }),
                }
            }
        }
    }

    Ok(vars)
}

#[tauri::command]
pub async fn delete_env_var(
    repo_id: String,
    key: String,
    db: State<'_, DbPool>,
) -> Result<(), String> {
    let config: Option<String> =
        sqlx::query_scalar("SELECT conductor_config FROM repos WHERE id = ?")
            .bind(&repo_id)
            .fetch_one(&db.0)
            .await
            .map_err(|e| e.to_string())?;

    let mut parsed: serde_json::Value = config
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_else(|| serde_json::json!({}));

    if let Some(env_obj) = parsed
        .as_object_mut()
        .and_then(|o| o.get_mut("env_vars"))
        .and_then(|v| v.as_object_mut())
    {
        env_obj.remove(&key);
    }

    sqlx::query("UPDATE repos SET conductor_config = ? WHERE id = ?")
        .bind(parsed.to_string())
        .bind(&repo_id)
        .execute(&db.0)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Get decrypted env vars as HashMap for process injection.
#[allow(dead_code)] // Used by session.rs agent spawning
pub async fn get_env_vars_for_process(
    repo_id: &str,
    pool: &sqlx::SqlitePool,
) -> Result<HashMap<String, String>, String> {
    let enc_key = get_or_create_key(repo_id, pool).await?;

    let config: Option<String> =
        sqlx::query_scalar("SELECT conductor_config FROM repos WHERE id = ?")
            .bind(repo_id)
            .fetch_one(pool)
            .await
            .map_err(|e| e.to_string())?;

    let parsed: serde_json::Value = config
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_else(|| serde_json::json!({}));

    let mut vars = HashMap::new();

    if let Some(env_obj) = parsed.get("env_vars").and_then(|v| v.as_object()) {
        for (key, val) in env_obj {
            if let Some(encrypted_str) = val.as_str() {
                if let Ok(decrypted) = decrypt_value(&enc_key, encrypted_str) {
                    vars.insert(key.clone(), decrypted);
                }
            }
        }
    }

    Ok(vars)
}
