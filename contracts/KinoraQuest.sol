// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.19;

import "./KinoraAccessControl.sol";
import "./KinoraEscrow.sol";
import "./KinoraLibrary.sol";
import "./KinoraQuestData.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract KinoraQuest is Initializable {
  string public name;
  string public symbol;
  KinoraAccessControl public accessControl;
  KinoraQuestData public kinoraQuestData;
  KinoraEscrow public escrow;
  address public kinoraOpenAction;

  /**
   * @dev Modifier to ensure function caller is the quest invoker PKP.
   */
  modifier onlyQuestInvokerPKP() {
    if (msg.sender != accessControl.getAssignedPKPAddress()) {
      revert KinoraErrors.OnlyPKP();
    }
    _;
  }

  /**
   * @dev Modifier to ensure function caller is either the quest invoker PKP or an admin.
   */
  modifier onlyQuestInvokerPKPOrAdmin() {
    if (
      msg.sender != accessControl.getAssignedPKPAddress() &&
      !accessControl.isAdmin(msg.sender)
    ) {
      revert KinoraErrors.InvalidAddress();
    }
    _;
  }

  /**
   * @dev Modifier to ensure function caller is the open action address.
   */
  modifier onlyOpenAction() {
    if (kinoraOpenAction != msg.sender) {
      revert KinoraErrors.InvalidAddress();
    }
    _;
  }

  /**
   * @dev Modifier to ensure the quest associated with the provided pubId is open.
   * @param _pubId The Lens Pub Id of the quest.
   */
  modifier questOpen(uint256 _pubId) {
    uint256 _profileId = accessControl.getProfileId();
    if (
      kinoraQuestData.getQuestStatus(_profileId, _pubId) ==
      KinoraLibrary.Status.Closed
    ) {
      revert KinoraErrors.QuestClosed();
    }
    _;
  }

  // Event emitted when a new quest is created.
  event NewQuestCreated(
    uint256 profileId,
    uint256 pubId,
    uint256 milestoneCount
  );
  // Event emitted when a player completes a quest milestone.
  event PlayerCompleteQuestMilestone(
    uint256 pubId,
    uint256 milestone,
    uint256 playerProfileId
  );
  // Event emitted when a quest is terminated.
  event QuestTerminated(uint256 profileId, uint256 pubId);
  // Event emitted when a player joins a quest.
  event PlayerJoinQuest(uint256 pubId, uint256 playerProfileId);

  /**
   * @dev Initializes the contract with provided addresses.
   * @param _accessControlAddress Address of the AccessControl contract.
   * @param _escrowAddress Address of the Escrow contract.
   * @param _kinoraQuestDataAddress Address of the QuestData contract.
   * @param _kinoraOpenActionAddress Address of the OpenAction contract.
   */
  function initialize(
    address _accessControlAddress,
    address _escrowAddress,
    address _kinoraQuestDataAddress,
    address _kinoraOpenActionAddress
  ) public {
    name = "KinoraQuest";
    symbol = "KQU";
    accessControl = KinoraAccessControl(_accessControlAddress);
    escrow = KinoraEscrow(_escrowAddress);
    kinoraQuestData = KinoraQuestData(_kinoraQuestDataAddress);
    kinoraOpenAction = _kinoraOpenActionAddress;
  }

  /**
   * @dev Instantiates a new quest with provided details.
   * @param _encodedMilestones Encoded milestones data.
   * @param _maxPlayerCount Maximum number of players that can join the quest.
   * @param _pubId Lens Pub Id of the quest.
   * @param _profileId Lens Profile Id of the quest creator.
   */
  function instantiateNewQuest(
    bytes memory _encodedMilestones,
    uint256 _maxPlayerCount,
    uint256 _pubId,
    uint256 _profileId
  ) external onlyOpenAction {
    KinoraLibrary.Milestone[] memory _milestones = abi.decode(
      _encodedMilestones,
      (KinoraLibrary.Milestone[])
    );
    kinoraQuestData.newQuest(_milestones, _maxPlayerCount, _pubId, _profileId);

    emit NewQuestCreated(_profileId, _pubId, _milestones.length);
  }

  /**
   * @dev Terminates an ongoing quest.
   * @param _pubId Lens Pub Id of the quest to terminate.
   */
  function terminateQuest(
    uint256 _pubId
  ) public onlyQuestInvokerPKPOrAdmin questOpen(_pubId) {
    uint256 _profileId = accessControl.getProfileId();

    kinoraQuestData.updateQuestStatus(_profileId, _pubId);

    emit QuestTerminated(_profileId, _pubId);
  }

  /**
   * @dev Allows a player to join a quest.
   * @param _playerAddress Address of the joining player.
   * @param _pubId Lens Pub Id of the quest.
   * @param _playerProfileId Lens Profile Id of the joining player.
   */
  function playerJoinQuest(
    address _playerAddress,
    uint256 _pubId,
    uint256 _playerProfileId
  ) external onlyOpenAction questOpen(_pubId) {
    uint256 _profileId = accessControl.getProfileId();
    kinoraQuestData.joinQuest(
      _playerAddress,
      _pubId,
      _profileId,
      _playerProfileId
    );

    emit PlayerJoinQuest(_pubId, _playerProfileId);
  }

  /**
   * @dev Allows a player to complete a milestone of a quest.
   * @param _pubId Lens Pub Id of the quest.
   * @param _milestone Milestone number to be completed.
   * @param _playerProfileId Lens Profile Id of the completing player.
   */
  function playerCompleteMilestone(
    uint256 _pubId,
    uint256 _milestone,
    uint256 _playerProfileId
  ) external onlyOpenAction questOpen(_pubId) {
    uint256 _profileId = accessControl.getProfileId();
    address _playerAddress = kinoraQuestData.getPlayerAddress(_playerProfileId);
    if (
      _milestone == 0 ||
      _milestone > kinoraQuestData.getQuestMilestoneCount(_profileId, _pubId)
    ) {
      revert KinoraErrors.MilestoneInvalid();
    }

    bool _joined = kinoraQuestData.getPlayerHasJoinedQuest(
      _playerProfileId,
      _profileId,
      _pubId
    );

    if (
      _joined &&
      kinoraQuestData.getPlayerMilestonesCompletedPerQuest(
        _playerProfileId,
        _profileId,
        _pubId
      ) <
      _milestone &&
      (kinoraQuestData.getPlayerMilestonesCompletedPerQuest(
        _playerProfileId,
        _profileId,
        _pubId
      ) +
        1 ==
        _milestone) &&
      kinoraQuestData.getPlayerEligibleToClaimMilestone(
        _playerProfileId,
        _profileId,
        _pubId,
        _milestone
      )
    ) {
      if (
        kinoraQuestData.getQuestMilestoneRewardType(
          _profileId,
          _pubId,
          _milestone
        ) == KinoraLibrary.RewardType.ERC20
      ) {
        escrow.withdrawERC20(_playerAddress, _pubId, _milestone);
      } else {
        escrow.mintERC721(_playerAddress, _profileId, _pubId, _milestone);
      }

      kinoraQuestData.completeMilestone(
        _pubId,
        _profileId,
        _playerProfileId,
        _milestone
      );
    } else {
      revert KinoraErrors.PlayerNotEligible();
    }

    emit PlayerCompleteQuestMilestone(_pubId, _milestone, _playerProfileId);
  }
}
