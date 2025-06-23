use light_hasher::hash_to_field_size::hash_to_bn254_field_size_be;

fn main() {
    let input = std::env::args().nth(1).unwrap_or_default();
    let hash = hash_to_bn254_field_size_be(input.as_bytes());
    println!("{}", hex::encode(hash));
}
