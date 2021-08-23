#!/usr/bin/env bash

set -eu

cargo +nightly contract build --manifest-path newomegaquests/Cargo.toml
cargo +nightly contract build --manifest-path newomegamarket/Cargo.toml
cargo +nightly contract build --manifest-path newomegatokens/Cargo.toml
cargo +nightly contract build --manifest-path newomega/Cargo.toml
cargo +nightly contract build --manifest-path newomegastorage/Cargo.toml
cargo +nightly contract build --manifest-path newomegauniversestorage/Cargo.toml
cargo +nightly contract build --manifest-path newomegagame/Cargo.toml
cargo +nightly contract build --manifest-path newomegauniverse/Cargo.toml
cargo +nightly contract build --manifest-path newomegaranked/Cargo.toml
cargo +nightly contract build --manifest-path newomegaindustrial/Cargo.toml
cargo +nightly contract build
