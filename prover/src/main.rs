use pod_prover::compress_state;

fn main() {
    let data = b"demo";
    let (proof, root) = compress_state(data);
    println!("proof bytes: {} root: {:x?}", proof.len(), root);
}
