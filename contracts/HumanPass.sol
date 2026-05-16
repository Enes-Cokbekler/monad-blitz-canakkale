// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./interfaces/IHumanPass.sol";

/// @title HumanPass
/// @notice Issues short-lived on-chain proof-of-human sessions on Monad.
/// @dev Proofs are issued by a trusted verifier wallet after the user passes an off-chain
///      human challenge. Consumer apps read proof state via the IHumanPass interface.
contract HumanPass is IHumanPass {
    address public owner;
    address public verifier;
    uint256 public maxDuration;

    mapping(address => uint256) public humanUntil;

    event HumanProofIssued(address indexed user, uint256 validUntil);
    event HumanProofRevoked(address indexed user);
    event VerifierUpdated(address indexed oldVerifier, address indexed newVerifier);

    modifier onlyOwner() {
        require(msg.sender == owner, "HumanPass: caller is not owner");
        _;
    }

    modifier onlyVerifier() {
        require(msg.sender == verifier, "HumanPass: caller is not verifier");
        _;
    }

    constructor(address _verifier, uint256 _maxDuration) {
        require(_verifier != address(0), "HumanPass: verifier is zero address");
        require(_maxDuration > 0, "HumanPass: max duration is zero");

        owner = msg.sender;
        verifier = _verifier;
        maxDuration = _maxDuration;
    }

    /// @notice Replace the trusted verifier address. Only callable by the owner.
    /// @param _verifier New verifier address. Must not be zero.
    function setVerifier(address _verifier) external onlyOwner {
        require(_verifier != address(0), "HumanPass: verifier is zero address");

        address oldVerifier = verifier;
        verifier = _verifier;

        emit VerifierUpdated(oldVerifier, _verifier);
    }

    /// @notice Issue a HumanPass proof to `user` for `duration` seconds. Only callable by the verifier.
    /// @param user  Wallet that passed the human challenge.
    /// @param duration Proof validity in seconds. Must be > 0 and <= maxDuration.
    function issueHumanProof(address user, uint256 duration) external onlyVerifier {
        require(user != address(0), "HumanPass: user is zero address");
        require(duration > 0, "HumanPass: duration is zero");
        require(duration <= maxDuration, "HumanPass: duration exceeds max");

        uint256 validUntil = block.timestamp + duration;
        humanUntil[user] = validUntil;

        emit HumanProofIssued(user, validUntil);
    }

    /// @inheritdoc IHumanPass
    function isHuman(address user) external view returns (bool) {
        return humanUntil[user] > block.timestamp;
    }

    /// @inheritdoc IHumanPass
    function getHumanUntil(address user) external view returns (uint256) {
        return humanUntil[user];
    }

    /// @notice Revoke the HumanPass proof for `user`. Only callable by the verifier.
    /// @param user Wallet whose proof should be invalidated immediately.
    function revokeHumanProof(address user) external onlyVerifier {
        require(user != address(0), "HumanPass: user is zero address");

        humanUntil[user] = 0;

        emit HumanProofRevoked(user);
    }
}
