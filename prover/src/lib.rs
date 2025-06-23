use ark_bn254::Fr;
use ark_ff::{UniformRand};
use ark_std::test_rng;

pub fn compress_state(data: &[u8]) -> (Vec<u8>, [u8;32]) {
    let mut rng = test_rng();
    let fr = Fr::rand(&mut rng);
    let mut bytes = fr.into_bigint().to_bytes_be();
    bytes.extend_from_slice(data);
    let mut root = [0u8;32];
    let copy_len = bytes.len().min(32);
    root[..copy_len].copy_from_slice(&bytes[..copy_len]);
    (bytes, root)
}
