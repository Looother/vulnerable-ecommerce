use std::env;
use std::process;

extern "C" {
    fn getuid() -> u32;
    fn geteuid() -> u32;
}

/// Memory-safe status processing using Rust's safe string manipulation.
/// Guarantees no buffer overflows or memory safety violations.
fn process_status_safely(input: &str) {
    // Truncate to a max buffer size of 64 characters safely without memory overflow
    let safe_input: String = input.chars().take(64).collect();
    println!("Estatus del servicio procesado correctamente: {}", safe_input);
}

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() < 2 {
        eprintln!("Uso: {} <mensaje_de_estatus>", args[0]);
        process::exit(1);
    }

    unsafe {
        println!("[DEBUG] Real UID: {}, Effective UID: {}", getuid(), geteuid());
    }

    process_status_safely(&args[1]);
}
