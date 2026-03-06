use rand::seq::SliceRandom;
use sqlx::SqlitePool;

static DISTRICT_NAMES: &[&str] = &[
    "anand", "anantapur", "araria", "arwal", "aurangabad",
    "bagalkot", "balaghat", "balasore", "balrampur", "banaskantha",
    "banda", "bandipora", "bankura", "banswara", "barabanki",
    "baran", "bareilly", "bargarh", "barpeta", "barwani",
    "bathinda", "beed", "bellary", "betul", "bhadrak",
    "bhagalpur", "bharatpur", "bharuch", "bhavnagar", "bhilwara",
    "bhind", "bhojpur", "bidar", "bijapur", "bilaspur",
    "birbhum", "bishnupur", "bokaro", "bongaigaon", "budaun",
    "bundi", "burhanpur", "buxar", "cachar", "chamoli",
    "champawat", "champhai", "chandauli", "chandel", "chatra",
    "chikkamagaluru", "chitradurga", "chittoor", "churachandpur", "cooch-behar",
    "cuddalore", "cuttack", "dakshin-dinajpur", "dakshina-kannada", "daman",
    "dang", "dantewada", "darbhanga", "darjeeling", "datia",
    "davanagere", "debagarh", "deoghar", "dewas", "dhalai",
    "dhamtari", "dhanbad", "dharwad", "dhemaji", "dhenkanal",
    "dholpur", "dhubri", "dhule", "dibrugarh", "dima-hasao",
    "dindigul", "dindori", "dumka", "dungarpur", "durg",
    "east-champaran", "east-garo-hills", "east-godavari", "east-khasi-hills", "east-singhbhum",
    "ernakulam", "etawah", "faridkot", "fatehgarh-sahib", "fatehpur",
    "firozabad", "firozpur", "gadag", "gadchiroli", "ganjam",
    "garhwa", "gaya", "giridih", "goalpara", "godda",
    "golaghat", "gondiya", "gumla", "guna", "guntur",
    "gurdaspur", "hamirpur", "hanumangarh", "harda", "hassan",
    "haveri", "hazaribag", "hingoli", "hooghly", "hoshangabad",
    "hoshiarpur", "howrah", "idukki", "imphal-east", "imphal-west",
    "jaisalmer", "jajpur", "jalgaon", "jalore", "jalpaiguri",
    "jamtara", "jashpur", "jaunpur", "jehanabad", "jhajjar",
    "jharsuguda", "jhunjhunu", "jind", "jodhpur", "jorhat",
    "junagadh", "kabirdham", "kaimur", "kaithal", "kalahandi",
    "kamrup", "kangra", "kanker", "kannur", "kapurthala",
    "karaikal", "karauli", "karimnagar", "karnal", "karur",
    "kasaragod", "kathua", "kaushambi", "kendrapara", "kendujhar",
    "khagaria", "khammam", "kheda", "khunti", "kinnaur",
    "kiphire", "kishanganj", "kodagu", "kohima", "kokrajhar",
    "kolar", "kolasib", "kolhapur", "kollam", "koraput",
    "korba", "koriya", "kottayam", "kullu", "kupwara",
    "kurnool", "kurukshetra", "kurung-kumey", "lahul-spiti", "lakhimpur",
    "lakhisarai", "latehar", "latur", "lawngtlai", "leh",
    "lohardaga", "lohit", "longleng", "lower-dibang-valley", "lower-subansiri",
    "lunglei", "madhepura", "madurai", "mahbubnagar", "mahe",
    "mahendragarh", "mahoba", "mainpuri", "malappuram", "malda",
    "malkangiri", "mamit", "mandi", "mandla", "mandsaur",
    "mandya", "mansa", "mathura", "mayurbhanj", "medak",
    "mewat", "mirzapur", "mokokchung", "mon", "morigaon",
    "morena", "muktsar", "munger", "murshidabad", "muzaffarpur",
    "mysore", "nadia", "nagaon", "nagaur", "nainital",
    "nalanda", "nalgonda", "namakkal", "nanded", "nandurbar",
    "narsinghpur", "nashik", "navsari", "nawada", "neemuch",
    "nilgiris", "nizamabad", "north-goa", "nuapada", "pakur",
    "palakkad", "palamu", "pali", "panchkula", "panchmahal",
    "panna", "papum-pare", "parbhani", "paschim-medinipur",
    "patiala", "patna", "perambalur", "phek", "pithoragarh",
    "porbandar", "prakasam", "pratapgarh", "pudukkottai", "pulwama",
    "purba-bardhaman", "purba-medinipur", "puri", "purnia", "raichur",
    "raigarh", "raipur", "raisen", "rajgarh", "rajkot",
    "rajnandgaon", "rajsamand", "ramgarh", "rampur", "ranchi",
    "ranga-reddy", "ratnagiri", "ratlam", "rewa", "rewari",
    "ri-bhoi", "rohtas", "rudraprayag", "rupnagar", "sabarkantha",
    "sagar", "saharanpur", "saharsa", "sahebganj", "saiha",
    "samastipur", "samba", "sambalpur", "sangli", "sangrur",
    "saran", "satara", "satna", "sawai-madhopur", "sehore",
    "senapati", "seoni", "serchhip", "shahdol", "shahjahanpur",
    "shajapur", "sheohar", "sheopur", "shimla", "shimoga",
    "shivpuri", "shopian", "shravasti", "siddharth-nagar", "sikar",
    "simdega", "sindhudurg", "singrauli", "sirmaur", "sirohi",
    "sirsa", "sitamarhi", "sitapur", "sivaganga", "siwan",
    "solan", "solapur", "sonbhadra", "sonipat", "south-goa",
    "south-tripura", "srikakulam", "srinagar", "supaul", "surat",
    "surendranagar", "surguja", "tamenglong", "tarn-taran", "tawang",
    "tenkasi", "thane", "thanjavur", "thoothukudi", "thoubal",
    "thrissur", "tikamgarh", "tinsukia", "tirap", "tiruchirappalli",
    "tirunelveli", "tiruvannamalai", "tonk", "tuensang", "tumkur",
    "udaipur", "udalguri", "udham-singh-nagar", "udhampur", "udupi",
    "ujjain", "ukhrul", "umaria", "una", "unnao",
    "upper-dibang-valley", "upper-siang", "upper-subansiri", "uttar-dinajpur",
    "uttarkashi", "vaishali", "valsad", "varanasi", "vellore",
    "vidisha", "virudhunagar", "vizianagaram", "wardha", "warangal",
    "washim", "wayanad", "west-champaran", "west-garo-hills",
    "west-godavari", "west-khasi-hills", "west-singhbhum", "west-tripura",
    "wokha", "yadgir", "yamunanagar", "yanam", "yavatmal",
    "zunheboto",
];

pub async fn generate_workspace_name(repo_id: &str, pool: &SqlitePool) -> Result<String, String> {
    let used: Vec<String> =
        sqlx::query_scalar("SELECT name FROM workspaces WHERE repo_id = ?")
            .bind(repo_id)
            .fetch_all(pool)
            .await
            .map_err(|e| e.to_string())?;

    let mut rng = rand::thread_rng();

    // Try to find an unused base name
    let candidates: Vec<&str> = DISTRICT_NAMES
        .iter()
        .filter(|n| !used.iter().any(|u| u.as_str() == **n))
        .copied()
        .collect();

    if let Some(name) = candidates.choose(&mut rng) {
        return Ok(name.to_string());
    }

    // All base names used — append numeric suffix
    let mut shuffled = DISTRICT_NAMES.to_vec();
    shuffled.shuffle(&mut rng);

    for base in &shuffled {
        let mut suffix = 2;
        loop {
            let candidate = format!("{}-{}", base, suffix);
            if !used.contains(&candidate) {
                return Ok(candidate);
            }
            suffix += 1;
            if suffix > 100 {
                break;
            }
        }
    }

    Ok(format!("workspace-{}", uuid::Uuid::new_v4()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_district_names_are_lowercase_and_valid() {
        for name in DISTRICT_NAMES {
            assert_eq!(*name, name.to_lowercase(), "Name should be lowercase: {}", name);
            assert!(
                name.chars().all(|c| c.is_ascii_lowercase() || c == '-'),
                "Name should only contain lowercase ascii and hyphens: {}",
                name
            );
        }
    }

    #[test]
    fn test_has_at_least_200_names() {
        assert!(
            DISTRICT_NAMES.len() >= 200,
            "Expected 200+ district names, got {}",
            DISTRICT_NAMES.len()
        );
    }

    #[test]
    fn test_no_duplicate_names() {
        let mut seen = std::collections::HashSet::new();
        for name in DISTRICT_NAMES {
            assert!(seen.insert(*name), "Duplicate district name: {}", name);
        }
    }
}
