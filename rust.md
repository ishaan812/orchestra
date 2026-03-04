Here’s a distilled set of Rust cleanliness/perf guidelines based on Ryan’s comments:

- Respect the lints, don’t silence them: Avoid ‎`#[allow(clippy::…)]` unless there’s a very strong, documented reason; fix the underlying warning instead of disabling it.

- Keep files and types small and focused: Split overly long files into modules; break giant structs (e.g. 30+ fields) into smaller sub-structs grouped by concern, and use typed aliases/structs instead of big tuples where element meaning isn’t obvious.

- Prefer cheap references over cloning: Don’t ‎`clone()` large structs, ‎`Vec`s, ‎`HashMap`s, or BSON documents just to read or iterate; pass ‎`&T`/‎`&mut T` or take ownership once, and only clone the minimal data you really need.

- Use better data structures for lookups: Replace ‎`Vec` + ‎`.contains()` patterns with ‎`HashSet` for membership checks; avoid O(n²) loops when a set or map gives you O(1) lookups.

- Avoid stringy, allocation-heavy patterns: Use enums as map keys instead of ‎`String` created via ‎`format!`; avoid ‎`to_string()` and ‎`format!` in tight loops, compute string keys once and reuse, and compare ‎`Option<String>` using ‎`as_deref()` rather than allocating new ‎`String`s.

- Prefer type-safe, explicit APIs: Don’t store keys as raw ‎`String` when an enum works; derive ‎`Hash`, ‎`Eq`, ‎`Copy` where appropriate so you can use types directly without cloning; avoid wildcard imports (‎`use crate::foo::*`) and import only the symbols you actually use.

- Make construction idiomatic and maintainable: Derive or implement ‎`Default` instead of hand-rolling large ‎`new()` initializers; use ‎`..Default::default()` patterns so adding fields doesn’t require touching every call site.

- Reduce repeated patterns with helpers/macros: If you have many functions with the same “get state → check → update phase → do work” flow, factor that into a helper or macro to remove duplication and make the phase transitions easier to reason about.

- Be conscious of string building and formatting cost: When building prompts/strings, either pre-allocate with ‎`String::with_capacity` or use a single ‎`format!` rather than many ‎`push_str` calls that cause repeated reallocations.

- Optimize “small” details in hot paths: Avoid cloning just-removed items from ‎`Vec`s, cloning vectors of transactions or resolution info when you can move them, and cloning BSON documents unless you truly need a separate copy — these micro-optimizations add up in core engine paths.