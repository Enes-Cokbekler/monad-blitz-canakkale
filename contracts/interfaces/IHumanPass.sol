// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title IHumanPass
/// @notice Minimal interface for reading HumanPass proofs on-chain.
/// @dev Consumer contracts import this interface and pass the deployed HumanPass address.
///      They do not need to know how challenges or signatures work — only the proof state matters.
interface IHumanPass {
    /// @notice Returns true if `user` holds an active, non-expired HumanPass proof.
    /// @param user The wallet address to check.
    /// @return True when the proof exists and has not expired.
    function isHuman(address user) external view returns (bool);

    /// @notice Returns the Unix timestamp (seconds) at which the proof for `user` expires.
    /// @dev Returns 0 if no proof has ever been issued or if it was revoked.
    ///      A non-zero value in the past means the proof is expired.
    /// @param user The wallet address to query.
    /// @return The expiry timestamp in seconds since the Unix epoch.
    function getHumanUntil(address user) external view returns (uint256);
}
