// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../interfaces/IHumanPass.sol";

/// @title HumanProtectedAction
/// @notice Example consumer contract demonstrating HumanPass integration.
/// @dev Any Monad app can follow this pattern: import IHumanPass, pass the deployed
///      HumanPass address in the constructor, and gate actions with isHuman(msg.sender).
///      This contract is an integration example only — not a HumanPass core contract.
contract HumanProtectedAction {
    /// @notice The HumanPass contract used for proof verification.
    IHumanPass public humanPass;

    /// @notice Tracks which addresses have already performed the protected action.
    mapping(address => bool) public hasPerformedAction;

    /// @notice Emitted when a verified human successfully performs the protected action.
    event ProtectedActionPerformed(address indexed user);

    /// @param humanPassAddress Address of the deployed HumanPass contract.
    constructor(address humanPassAddress) {
        require(humanPassAddress != address(0), "HumanProtectedAction: zero address");
        humanPass = IHumanPass(humanPassAddress);
    }

    /// @notice Perform the protected action. Requires an active HumanPass proof.
    /// @dev Reverts if the caller has no valid proof or has already performed the action.
    function performProtectedAction() external {
        require(humanPass.isHuman(msg.sender), "HumanProtectedAction: HumanPass required");
        require(!hasPerformedAction[msg.sender], "HumanProtectedAction: already performed");

        hasPerformedAction[msg.sender] = true;

        emit ProtectedActionPerformed(msg.sender);
    }
}
