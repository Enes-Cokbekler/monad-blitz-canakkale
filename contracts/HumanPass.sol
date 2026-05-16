// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract HumanPass {
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

    function setVerifier(address _verifier) external onlyOwner {
        require(_verifier != address(0), "HumanPass: verifier is zero address");

        address oldVerifier = verifier;
        verifier = _verifier;

        emit VerifierUpdated(oldVerifier, _verifier);
    }

    function issueHumanProof(address user, uint256 duration) external onlyVerifier {
        require(user != address(0), "HumanPass: user is zero address");
        require(duration > 0, "HumanPass: duration is zero");
        require(duration <= maxDuration, "HumanPass: duration exceeds max");

        uint256 validUntil = block.timestamp + duration;
        humanUntil[user] = validUntil;

        emit HumanProofIssued(user, validUntil);
    }

    function isHuman(address user) external view returns (bool) {
        return humanUntil[user] > block.timestamp;
    }

    function getHumanUntil(address user) external view returns (uint256) {
        return humanUntil[user];
    }

    function revokeHumanProof(address user) external onlyVerifier {
        require(user != address(0), "HumanPass: user is zero address");

        humanUntil[user] = 0;

        emit HumanProofRevoked(user);
    }
}
