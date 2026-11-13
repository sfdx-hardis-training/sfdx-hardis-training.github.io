/*
 * Pipeline Pinball, the bonus table of Guinea Run: it opens once the ten
 * worlds are done. The guinea pig, rolled into a ball, plays the pipeline as
 * a pinball table: the ramps are the branches, the Pull Request scoop starts
 * one mission per world, and Release day waits for those who finish all ten.
 * Three balls, extra balls to earn, and the table gets harder at each level:
 * the best players can last an hour.
 *
 * This module only puts the pieces together: physics.js (the balls), layout.js
 * (the table), rules.js and missions.js (the game), view.js and ball.js (the
 * look), autoplay.js (the player of the check). It is not a world of WORLDS:
 * the shell opens it from its own card (KIND = "bonus"), passes it held keys
 * and touches (hold), saves its game while it is paused (ctx.bonus), and
 * sends its result to the Hall of Fame on its own board.
 */
import { buildTable, TABLE } from "./layout.js";
import { createRules } from "./rules.js";
import { createView } from "./view.js";
import { createAutoplay } from "./autoplay.js";
import { createMusic } from "../../core/music.js";
import { THEMES } from "../../core/themes.js";
import { pickAdmins, adminFaceUrl } from "../../core/faces.js";
import { readingMs } from "../../hud.js";
import { createDmd } from "./dmd.js";

export const KIND = "bonus";
export const PADS = "flippers";
// The table plays its own theme, to count the beat of mission 6
export const MUSIC = false;
export const MODELS = ["salesforce", "data-cloud", "vegetables"];
export const PHONE_MESSAGES = "top";
export const QUOTES = [{ lab: "2.7", text: "Accept Current" }];

const SAVE_EVERY_S = 5;
// The moments the dot-matrix display shouts, and those it says instead of a toast
const DMD_WORDS = {
  pbJackpot: "dmdJackpot",
  pbReleaseJackpot: "dmdJackpot",
  pbSuperJackpot: "dmdSuperJackpot",
  pbMultiball: "dmdMultiball",
  pbSkillShot: "dmdSkillShot",
  pbSuperSkill: "dmdSuperSkill",
  pbExtraBall: "dmdExtraBall",
  pbBallSaved: "dmdBallSaved",
  pbTilt: "dmdTilt",
  pbTiltWarning: "dmdDanger",
  pbMissionDone: "dmdMissionDone",
  pbReleased: "dmdReleased",
  pbLocked: "dmdLocked",
  pbCombo: "dmdCombo",
  pbLoops: "dmdLoops",
  pbPipelineCombo: "dmdPipeline",
  pbHurryDone: "dmdHurry",
  pbSecretSkill: "dmdSecretSkill",
  pbCodeFreeze: "dmdCodeFreeze",
  pbProductionOpen: "dmdProductionOpen",
  pbNoteFound: "dmdNote",
  pbShootAgain: "dmdShootAgain",
  pbBallN: "dmdBall",
  pbKickback: "dmdRollback",
  pbLockLit: "dmdLockLit",
  pbNextLevel: "dmdLevelUp",
  pbReleaseDay: "dmdReleaseDay",
  pbBonusXUp: "dmdBonusX",
  pbHotfix: "dmdHotfix",
  pbQualityGate: "dmdQualityGate",
  pbQuickDeploy: "dmdQuickDeploy",
  pbReplay: "dmdReplay",
  pbMatchWon: "dmdMatch",
  pbTop5: "dmdTop5",
  pbBackupRestored: "dmdBackup"
};
const DMD_ONLY = new Set(["pbLoops", "pbSecretSkill", "pbHotfix", "pbReplay", "pbJackpot", "pbReleaseJackpot", "pbSuperJackpot", "pbSkillShot", "pbSuperSkill", "pbCombo", "pbBallSaved", "pbKickback", "pbBonusXUp", "pbLocked", "pbBallN", "pbShootAgain", "pbTilt", "pbTiltWarning", "pbExtraBall", "pbMultiball"]);
// What a mission counts to, for its line on the display
const GOAL_TOTALS = { pbGoal0: 4, pbGoal1_0: 8, pbGoal1_1: 2, pbGoal2: 3, pbGoal3: 3, pbGoal4: 75, pbGoal5: 4, pbGoal6: 8, pbGoal7: 3, pbGoal8: 5, pbGoal9: 6, pbGoalWizard: 6, pbGoalWizardBoss: 3 };
const PULL_S = 0.9;
const WHEEK_GAP_S = 1.5;
const NUDGE_SPEED = 4.5;

export const TEXTS = {
  en: {
    intro: "You took US-014 all the way to production. The pipeline has one more trick: the table. Roll up, shoot the branches in order, open the Pull Request scoop for a mission per world, and last as long as you can.",
    how1: "Left and right: the flippers (arrows, A and D, or Shift); on a phone, the left and right halves of the screen",
    how2: "Space or Down pulls the plunger: hold it, let go. On a phone, hold the right half while the ball waits",
    how3: "Up or W nudges the table, a swipe up on a phone. Three nudges too close together: tilt",
    note: "A pinball is a pipeline you can feel: every shot that skips a branch comes back down. - V.",
    pbTitle: "Pipeline Pinball",
    pbShort0: "Tools",
    pbShort1: "US-014",
    pbShort2: "Commit",
    pbShort3: "Base branch",
    pbShort4: "Coverage",
    pbShort5: "Merge",
    pbShort6: "On the beat",
    pbShort7: "Promotion",
    pbShort8: "Release",
    pbShort9: "Monitoring",
    pbApronPromote: "Promote in order: integration, uat, preprod. Then production opens.",
    pbApronMissions: "Pull Request scoop: a mission per world. All ten: Release day.",
    dmdGo: "GO!",
    dmdJackpot: "Jackpot",
    dmdSuperJackpot: "Super jackpot",
    dmdMultiball: "Multiball",
    dmdSkillShot: "Skill shot",
    dmdSuperSkill: "Super skill",
    dmdExtraBall: "Extra ball",
    dmdBallSaved: "Ball saved",
    dmdTilt: "Tilt",
    dmdDanger: "Danger",
    dmdMissionDone: "Mission done",
    dmdReleased: "Released",
    dmdLocked: "Ball locked",
    dmdCombo: "Combo",
    dmdLoops: "Loop",
    dmdPipeline: "Pipeline",
    dmdHurry: "Hotfix",
    dmdSecretSkill: "Secret skill",
    dmdCodeFreeze: "Code freeze",
    dmdFlips: "flips",
    dmdProductionOpen: "Production open",
    dmdNote: "Victor's note",
    dmdShootAgain: "Shoot again",
    dmdBall: "Ball",
    dmdRollback: "Rollback",
    dmdLockLit: "Lock is lit",
    dmdLevelUp: "Level up",
    dmdReleaseDay: "Release day",
    dmdBonusX: "Bonus x",
    pbFieldIntegration: "integration",
    pbFieldUat: "uat",
    pbFieldPreprod: "preprod",
    pbFieldProduction: "production",
    pbFieldPullRequest: "Pull Request",
    pbFieldRecentChanges: "Recent Changes",
    pbFieldChecks: "Checks",
    pbFieldRollback: "Rollback",
    pbFieldBallSave: "Sandbox refresh",
    pbFieldExtraBall: "Extra ball",
    pbFieldNote: "Victor's note",
    pbFieldDeploy: "Deploy to all orgs",
    pbFieldProductionOrg: "Production org",
    pbFieldRelease: "Release",
    pbFieldHotfix: "Hotfix",
    pbFieldBackups: "Backups",
    pbFieldCodeQuality: "Code quality",
    pbFieldShootAgain: "Shoot again",
    pbReplay: "Replay! Extra ball",
    pbQualityGate: "Quality gate passed: bonus x{{n}} +{{points}}",
    dmdQualityGate: "Quality gate",
    pbFieldTerminal: "sf hardis",
    pbFieldValidate: "Validate",
    pbCmdBackup: "Backup taken: ball save +{{points}}",
    pbCmdSave: "Work saved: extra ball lit at the scoop +{{points}}",
    pbCmdDeploy: "Smart deployment: lock lit +{{points}}",
    pbCmdDoc: "Documentation generated: bonus x{{n}} +{{points}}",
    pbCmdLicenses: "Unused licenses found, money saved +{{points}}",
    pbCmdAudit: "Audit trail read: Victor's note lit +{{points}}",
    pbCmdNew: "New User Story: a mission starts +{{points}}",
    pbCmdMonitor: "Monitoring on: Rollback lit +{{points}}",
    pbCmdClean: "References cleaned: Recent Changes reset +{{points}}",
    pbCmdApi: "API versions checked +{{points}}",
    pbCmdLegacy: "Legacy API calls found before they break +{{points}}",
    pbAdminName: "An admin",
    pbRaidAdmin: "But it's faster! I'm changing production by hand.",
    pbRaid: "An admin is changing production by hand! Hit him before his change set lands.",
    pbRaidCaught: "Caught by the monitoring backup +{{points}}",
    pbRaidMissed: "A change in production that is not in git: the promotion is lost. Retrofit it at the Pull Request scoop.",
    pbRetrofitDone: "Retrofitted through a Pull Request: the promotion is back +{{points}}",
    pbFlowHit: "Monster Flow {{n}}/3 +{{points}}",
    pbFlowRefactored: "The monster Flow is refactored into Apex +{{points}}",
    pbValidating: "Validating the deployment...",
    pbValidated: "Validated: Quick deploy on the production ramp!",
    pbQuickDeploy: "Quick deploy! Everything scores double +{{points}}",
    dmdRaid: "Change in prod!",
    dmdCaught: "Caught!",
    dmdRefactored: "Refactored",
    dmdValidating: "Validating...",
    dmdQuickLit: "Quick deploy lit",
    dmdQuickDeploy: "Quick deploy x2",
    pbMatchWon: "Match! One more ball",
    pbTop5: "This game enters the top 5 of the Hall of Fame: send it at the end",
    dmdReplay: "Replay",
    dmdMatch: "Match",
    dmdTop5: "Top 5",
    pbHotfix: "Hotfix, straight to the inlane +{{points}}",
    pbHurryStart: "A bug in production: shoot the Hotfix hole before its value runs out",
    pbHurryDone: "Hotfix deployed +{{points}}",
    pbHurryMissed: "The bug stayed in production too long: a hotfix must reach production fast, then go back down the pipeline",
    pbLoops: "Loop x{{n}} +{{points}}",
    pbPipelineCombo: "The whole pipeline in one go: integration, uat, preprod, production +{{points}}",
    pbSecretSkill: "Secret skill shot: straight into the terminal +{{points}}",
    pbCodeFreeze: "Code freeze: {{n}} flips to stop the Sales Manager",
    pbFreezeOver: "Code freeze over",
    pbFreezeTip: "During a code freeze only the release goes through: be quick and precise",
    pbBackupRestored: "Backup restored: ball save +{{points}}",
    dmdHotfix: "Hotfix",
    dmdBackup: "Backup restored",
    pbBall: "Ball {{n}}",
    pbLevel: "Level {{n}}",
    pbSelectTitle: "Pick a mission with the flippers",
    pbTool1: "VS Code",
    pbTool2: "Salesforce CLI",
    pbTool3: "Git",
    pbTool4: "sfdx-hardis",
    pbTool: "{{tool}} installed +{{points}}",
    pbMission0: "Mission: Install the tools",
    pbMission1: "Mission: Build US-014",
    pbMission2: "Mission: Commit only what you need",
    pbMission3: "Mission: The right base branch",
    pbMission4: "Mission: Coverage",
    pbMission5: "Mission: Merge with Mariia",
    pbMission6: "Mission: Integration on the beat",
    pbMission7: "Mission: Promotion",
    pbMission8: "Mission: Release to production",
    pbMission9: "Mission: Monitoring",
    pbName0: "Install the tools",
    pbName1: "Build US-014",
    pbName2: "Commit only what you need",
    pbName3: "The right base branch",
    pbName4: "Coverage",
    pbName5: "Merge with Mariia",
    pbName6: "Integration on the beat",
    pbName7: "Promotion",
    pbName8: "Release to production",
    pbName9: "Monitoring",
    pbNameWizard: "Release day",
    pbGoal0: "Shoot the 4 lit shots: {{n}}/4 tools",
    pbGoal1_0: "The mushroom made you giant: build the field on the bumpers, {{n}}/8",
    pbGoal1_1: "Now the layout: hit the lit checks, {{n}}/2",
    pbGoal1_2: "Last, the permission set: the right orbit",
    pbGoal2: "Knock down the green files only: {{n}}/3",
    pbGoal3: "The integration ramp is the base branch: {{n}}/3. Not the red one, it is main",
    pbGoal4: "Spin the spinner to write tests: {{n}}% of 75%",
    pbGoal5: "Your ramp, then Mariia's, in turn: {{n}}/4 merged",
    pbGoal6: "Two balls: hit on the beat of the music, {{n}}/8",
    pbGoal7: "Promote: integration, uat, preprod, in order ({{n}}/3)",
    pbGoal8: "Up to the Production floor: hit the Data Cloud rabbit, {{n}}/5",
    pbGoal9: "Hit the admins before their change set lands: {{n}}/6",
    pbGoalWizard: "Release day: every lit shot is a jackpot, {{n}}/6",
    pbGoalWizardBoss: "Code freeze: hit the Sales Manager on the Production floor, {{n}}/3, {{flips}} flips left",
    pbGoalSelect: "Pick the mission with the flippers",
    pbBuiltField: "Field built +{{points}}",
    pbBuiltLayout: "Layout built +{{points}}",
    pbBuiltPermission: "Permission set built: the field is visible +{{points}}",
    pbWrongFile: "Not part of US-014: the commit is lost",
    pbWrongProfile: "A whole Profile in the commit: that was red. Commit only what the story needs.",
    pbWrongTeammate: "A teammate's work in your commit: that was red. Commit only what the story needs.",
    pbCommitted: "In the commit +{{points}}",
    pbRightBase: "Base branch: integration +{{points}}",
    pbWrongBase: "That one is main: a Pull Request on main skips the pipeline. 8 seconds lost.",
    pbCovered: "75% covered, with real tests +{{points}}",
    pbBothKept: "Both sides kept +{{points}}",
    pbLostLine: "An outlane is an Accept Current Change: a line of Mariia's is lost.",
    pbOnBeat: "On the beat +{{points}}",
    pbPromoted: "Promoted to {{org}} +{{points}}",
    pbOrg0: "integration",
    pbOrg1: "uat",
    pbOrg2: "preprod",
    pbSickLeave: "The uat tester is on sick leave! Take the promotion branch: the right orbit.",
    pbRabbitHit: "Data Cloud error caught +{{points}}",
    pbAdminAway: "An admin changed production by hand: shoot the scoop to retrofit it",
    pbAdminCaught: "Caught before production +{{points}}",
    pbRetrofit: "Retrofitted through a Pull Request +{{points}}",
    pbReleaseJackpot: "Release jackpot +{{points}}",
    pbSalesManagerHit: "The Sales Manager hesitates +{{points}}",
    pbReleaseDone: "Released! +{{points}}",
    pbBallSaved: "Sandbox refreshed: ball saved",
    pbShootAgain: "Shoot again!",
    pbBallN: "Ball {{n}}",
    pbReleaseDay: "Release day! Four balls, every shot a jackpot",
    pbReleaseDayReady: "All ten missions done: Release day!",
    pbMissionDone: "Mission done +{{points}}",
    pbExtraLit: "Extra ball lit at the Pull Request scoop",
    pbNextLevel: "Level {{n}}: more points, a shorter ball save",
    pbNoteFound: "Victor's note +{{points}}",
    pbNoteLit: "Victor's note is on a shot: find it",
    pbCombo: "Combo x{{n}} +{{points}}",
    pbJackpot: "Jackpot x{{n}} +{{points}}",
    pbSuperLit: "Super jackpot lit: the production ramp",
    pbSuperJackpot: "Super jackpot +{{points}}",
    pbPromo1: "Promoted to integration +{{points}}",
    pbPromo2: "Promoted to uat +{{points}}",
    pbPromo3: "Promoted to preprod +{{points}}",
    pbProductionOpen: "Production is open: the centre ramp!",
    pbMultiball: "Deploy to all orgs!",
    pbExtraBall: "Extra ball!",
    pbReleased: "Released to production +{{points}}",
    pbChangesAll: "All Recent Changes +{{points}}",
    pbLockLit: "Recent Changes done: lock lit on the integration ramp +{{points}}",
    pbLocked: "Ball {{n}} locked +{{points}}",
    pbKickbackLit: "Checks green: Rollback lit +{{points}}",
    pbChecksGreen: "Checks green +{{points}}",
    pbApproved: "The Sales Manager approves the release +{{points}}",
    pbSalesManagerNo: "The Sales Manager: one more approval first",
    pbKickback: "Rollback!",
    pbSkillShot: "Skill shot +{{points}}",
    pbSuperSkill: "Super skill shot +{{points}}",
    pbBonusXUp: "Bonus x{{n}} +{{points}}",
    pbProduction: "Production floor +{{points}}",
    pbTimeUp: "Time is up",
    pbTilt: "Tilt",
    pbTiltWarning: "Careful...",
    pbHintPromo0: "Promote: shoot the integration ramp",
    pbHintPromo1: "Promote: shoot the uat ramp",
    pbHintPromo2: "Promote: shoot the left orbit, preprod",
    pbHintProduction: "Production is open: the centre ramp",
    pbHintLock: "Lock lit: the integration ramp",
    pbHintJackpots: "Deploy to all orgs: integration, uat and preprod are jackpots",
    pbHintSuper: "Super jackpot: the production ramp",
    pbHintReleaseDay: "Release day waits at the Pull Request scoop",
    pbEndOfBall: "End of ball",
    pbBonusRamps: "Ramps and orbits: {{n}}",
    pbBonusTargets: "Targets: {{n}}",
    pbBonusBumpers: "Apex triggers: {{n}}",
    pbBonusMissions: "Missions: {{n}}",
    pbBonusX: "Bonus multiplier x{{n}}",
    pbTilted: "Tilted: no bonus this ball",
    pbMissed: "Time is up, mission still to do. The rule: {{rule}}"
  },
  fr: {
    intro: "Vous avez emmené US-014 jusqu'en production. Le pipeline a encore un tour : la table. En boule, enchaînez les branches dans l'ordre, ouvrez le trou Pull Request pour une mission par monde, et tenez le plus longtemps possible.",
    how1: "Gauche et droite : les flippers (flèches, Q et D, ou Maj) ; sur téléphone, les moitiés gauche et droite de l'écran",
    how2: "Espace ou Bas tire le lanceur : maintenez, relâchez. Sur téléphone, maintenez la moitié droite quand la bille attend",
    how3: "Haut ou Z secoue la table, un glisser vers le haut sur téléphone. Trois secousses trop rapprochées : tilt",
    note: "Un flipper, c'est un pipeline qu'on sent : chaque tir qui saute une branche redescend. - V.",
    pbTitle: "Pipeline Pinball",
    pbShort0: "Outils",
    pbShort1: "US-014",
    pbShort2: "Commit",
    pbShort3: "Branche de base",
    pbShort4: "Couverture",
    pbShort5: "Merge",
    pbShort6: "En rythme",
    pbShort7: "Promotion",
    pbShort8: "Release",
    pbShort9: "Monitoring",
    pbApronPromote: "Promouvez dans l'ordre : integration, uat, preprod. Puis la production s'ouvre.",
    pbApronMissions: "Trou Pull Request : une mission par monde. Les dix : jour de release.",
    dmdGo: "GO !",
    dmdJackpot: "Jackpot",
    dmdSuperJackpot: "Super jackpot",
    dmdMultiball: "Multibille",
    dmdSkillShot: "Tir d'adresse",
    dmdSuperSkill: "Super tir",
    dmdExtraBall: "Bille en plus",
    dmdBallSaved: "Bille sauvée",
    dmdTilt: "Tilt",
    dmdDanger: "Attention",
    dmdMissionDone: "Mission réussie",
    dmdReleased: "En production",
    dmdLocked: "Bille verrouillée",
    dmdCombo: "Combo",
    dmdLoops: "Boucle",
    dmdPipeline: "Pipeline",
    dmdHurry: "Hotfix",
    dmdSecretSkill: "Tir secret",
    dmdCodeFreeze: "Code freeze",
    dmdFlips: "coups",
    dmdProductionOpen: "Production ouverte",
    dmdNote: "Note de Victor",
    dmdShootAgain: "Rejouez",
    dmdBall: "Bille",
    dmdRollback: "Rollback",
    dmdLockLit: "Verrou allumé",
    dmdLevelUp: "Niveau suivant",
    dmdReleaseDay: "Jour de release",
    dmdBonusX: "Bonus x",
    pbFieldIntegration: "integration",
    pbFieldUat: "uat",
    pbFieldPreprod: "preprod",
    pbFieldProduction: "production",
    pbFieldPullRequest: "Pull Request",
    pbFieldRecentChanges: "Modifications récentes",
    pbFieldChecks: "Checks",
    pbFieldRollback: "Rollback",
    pbFieldBallSave: "Refresh de sandbox",
    pbFieldExtraBall: "Bille en plus",
    pbFieldNote: "Note de Victor",
    pbFieldDeploy: "Déployer partout",
    pbFieldProductionOrg: "Org de production",
    pbFieldRelease: "Release",
    pbFieldHotfix: "Hotfix",
    pbFieldBackups: "Backups",
    pbFieldCodeQuality: "Qualité du code",
    pbFieldShootAgain: "Rejouez",
    pbReplay: "Replay ! Bille en plus",
    pbQualityGate: "Quality gate passé : bonus x{{n}} +{{points}}",
    dmdQualityGate: "Quality gate",
    pbFieldTerminal: "sf hardis",
    pbFieldValidate: "Valider",
    pbCmdBackup: "Backup fait : bille sauvée +{{points}}",
    pbCmdSave: "Travail enregistré : bille en plus allumée au trou +{{points}}",
    pbCmdDeploy: "Déploiement intelligent : verrou allumé +{{points}}",
    pbCmdDoc: "Documentation générée : bonus x{{n}} +{{points}}",
    pbCmdLicenses: "Licences inutilisées trouvées, de l'argent économisé +{{points}}",
    pbCmdAudit: "Audit trail lu : note de Victor allumée +{{points}}",
    pbCmdNew: "Nouvelle User Story : une mission commence +{{points}}",
    pbCmdMonitor: "Monitoring en route : Rollback allumé +{{points}}",
    pbCmdClean: "Références nettoyées : modifications récentes remises +{{points}}",
    pbCmdApi: "Versions d'API vérifiées +{{points}}",
    pbCmdLegacy: "Appels d'API obsolètes trouvés avant qu'ils ne cassent +{{points}}",
    pbAdminName: "Un admin",
    pbRaidAdmin: "Mais c'est plus rapide ! Je modifie la production à la main.",
    pbRaid: "Un admin modifie la production à la main ! Touchez-le avant que son change set n'arrive.",
    pbRaidCaught: "Attrapé par le backup du monitoring +{{points}}",
    pbRaidMissed: "Une modification en production qui n'est pas dans git : la promotion est perdue. Faites le retrofit au trou Pull Request.",
    pbRetrofitDone: "Retrofit par une Pull Request : la promotion revient +{{points}}",
    pbFlowHit: "Flow monstre {{n}}/3 +{{points}}",
    pbFlowRefactored: "Le Flow monstre est refactoré en Apex +{{points}}",
    pbValidating: "Validation du déploiement...",
    pbValidated: "Validé : Quick deploy sur la rampe production !",
    pbQuickDeploy: "Quick deploy ! Tout compte double +{{points}}",
    dmdRaid: "Modif en prod !",
    dmdCaught: "Attrapé !",
    dmdRefactored: "Refactoré",
    dmdValidating: "Validation...",
    dmdQuickLit: "Quick deploy allumé",
    dmdQuickDeploy: "Quick deploy x2",
    pbMatchWon: "Match ! Une bille de plus",
    pbTop5: "Cette partie entre dans le top 5 du Hall of Fame : envoyez-la à la fin",
    dmdReplay: "Replay",
    dmdMatch: "Match",
    dmdTop5: "Top 5",
    pbHotfix: "Hotfix, droit vers le couloir +{{points}}",
    pbHurryStart: "Un bug en production : visez le trou Hotfix avant que sa valeur ne fonde",
    pbHurryDone: "Hotfix déployé +{{points}}",
    pbHurryMissed: "Le bug est resté trop longtemps en production : un hotfix doit y arriver vite, puis redescendre le pipeline",
    pbLoops: "Boucle x{{n}} +{{points}}",
    pbPipelineCombo: "Tout le pipeline d'un coup : integration, uat, preprod, production +{{points}}",
    pbSecretSkill: "Tir d'adresse secret : droit dans le terminal +{{points}}",
    pbCodeFreeze: "Code freeze : {{n}} coups de flipper pour arrêter le Sales Manager",
    pbFreezeOver: "Fin du code freeze",
    pbFreezeTip: "Pendant un code freeze, seule la release passe : soyez rapide et précis",
    pbBackupRestored: "Backup restauré : bille sauvée +{{points}}",
    dmdHotfix: "Hotfix",
    dmdBackup: "Backup restauré",
    pbBall: "Bille {{n}}",
    pbLevel: "Niveau {{n}}",
    pbSelectTitle: "Choisissez une mission avec les flippers",
    pbTool1: "VS Code",
    pbTool2: "Salesforce CLI",
    pbTool3: "Git",
    pbTool4: "sfdx-hardis",
    pbTool: "{{tool}} installé +{{points}}",
    pbMission0: "Mission : installer les outils",
    pbMission1: "Mission : construire US-014",
    pbMission2: "Mission : commiter seulement le nécessaire",
    pbMission3: "Mission : la bonne branche de base",
    pbMission4: "Mission : la couverture",
    pbMission5: "Mission : merger avec Mariia",
    pbMission6: "Mission : integration en rythme",
    pbMission7: "Mission : la promotion",
    pbMission8: "Mission : la mise en production",
    pbMission9: "Mission : le monitoring",
    pbName0: "Installer les outils",
    pbName1: "Construire US-014",
    pbName2: "Commiter seulement le nécessaire",
    pbName3: "La bonne branche de base",
    pbName4: "La couverture",
    pbName5: "Merger avec Mariia",
    pbName6: "Integration en rythme",
    pbName7: "La promotion",
    pbName8: "La mise en production",
    pbName9: "Le monitoring",
    pbNameWizard: "Jour de release",
    pbGoal0: "Touchez les 4 tirs allumés : {{n}}/4 outils",
    pbGoal1_0: "Le champignon vous a rendu géant : construisez le champ sur les bumpers, {{n}}/8",
    pbGoal1_1: "Puis la présentation : touchez les checks allumés, {{n}}/2",
    pbGoal1_2: "Enfin, le permission set : l'orbite de droite",
    pbGoal2: "Faites tomber seulement les fichiers verts : {{n}}/3",
    pbGoal3: "La rampe integration est la branche de base : {{n}}/3. Pas la rouge, c'est main",
    pbGoal4: "Faites tourner le spinner pour écrire des tests : {{n}}% sur 75%",
    pbGoal5: "Votre rampe, puis celle de Mariia, à tour de rôle : {{n}}/4 mergés",
    pbGoal6: "Deux billes : touchez en rythme avec la musique, {{n}}/8",
    pbGoal7: "Promouvez : integration, uat, preprod, dans l'ordre ({{n}}/3)",
    pbGoal8: "Montez à l'étage Production : touchez le lapin Data Cloud, {{n}}/5",
    pbGoal9: "Touchez les admins avant que leur change set n'arrive : {{n}}/6",
    pbGoalWizard: "Jour de release : chaque tir allumé est un jackpot, {{n}}/6",
    pbGoalWizardBoss: "Code freeze : touchez le Sales Manager à l'étage Production, {{n}}/3, encore {{flips}} coups de flipper",
    pbGoalSelect: "Choisissez la mission avec les flippers",
    pbBuiltField: "Champ créé +{{points}}",
    pbBuiltLayout: "Présentation faite +{{points}}",
    pbBuiltPermission: "Permission set créé : le champ est visible +{{points}}",
    pbWrongFile: "Pas dans US-014 : le commit est perdu",
    pbWrongProfile: "Un Profile entier dans le commit : il était rouge. Commitez seulement ce que la story demande.",
    pbWrongTeammate: "Le travail d'un collègue dans votre commit : il était rouge. Commitez seulement ce que la story demande.",
    pbCommitted: "Dans le commit +{{points}}",
    pbRightBase: "Branche de base : integration +{{points}}",
    pbWrongBase: "Celle-là, c'est main : une Pull Request sur main saute le pipeline. 8 secondes perdues.",
    pbCovered: "75 % couverts, avec de vrais tests +{{points}}",
    pbBothKept: "Les deux côtés gardés +{{points}}",
    pbLostLine: "Une sortie de côté, c'est un Accept Current Change : une ligne de Mariia est perdue.",
    pbOnBeat: "En rythme +{{points}}",
    pbPromoted: "Promu en {{org}} +{{points}}",
    pbOrg0: "integration",
    pbOrg1: "uat",
    pbOrg2: "preprod",
    pbSickLeave: "La testeuse uat est en arrêt maladie ! Prenez la branche de promotion : l'orbite de droite.",
    pbRabbitHit: "Erreur Data Cloud attrapée +{{points}}",
    pbAdminAway: "Un admin a modifié la production à la main : touchez le trou pour faire le retrofit",
    pbAdminCaught: "Attrapé avant la production +{{points}}",
    pbRetrofit: "Retrofit par une Pull Request +{{points}}",
    pbReleaseJackpot: "Jackpot de release +{{points}}",
    pbSalesManagerHit: "Le Sales Manager hésite +{{points}}",
    pbReleaseDone: "C'est en production ! +{{points}}",
    pbBallSaved: "Sandbox rafraîchie : bille sauvée",
    pbShootAgain: "Rejouez !",
    pbBallN: "Bille {{n}}",
    pbReleaseDay: "Jour de release ! Quatre billes, chaque tir est un jackpot",
    pbReleaseDayReady: "Les dix missions faites : jour de release !",
    pbMissionDone: "Mission réussie +{{points}}",
    pbExtraLit: "Bille en plus allumée au trou Pull Request",
    pbNextLevel: "Niveau {{n}} : plus de points, une bille sauvée moins longtemps",
    pbNoteFound: "La note de Victor +{{points}}",
    pbNoteLit: "La note de Victor est sur un tir : trouvez-la",
    pbCombo: "Combo x{{n}} +{{points}}",
    pbJackpot: "Jackpot x{{n}} +{{points}}",
    pbSuperLit: "Super jackpot allumé : la rampe production",
    pbSuperJackpot: "Super jackpot +{{points}}",
    pbPromo1: "Promu en integration +{{points}}",
    pbPromo2: "Promu en uat +{{points}}",
    pbPromo3: "Promu en preprod +{{points}}",
    pbProductionOpen: "La production est ouverte : la rampe du centre !",
    pbMultiball: "Déployer partout !",
    pbExtraBall: "Bille en plus !",
    pbReleased: "Mis en production +{{points}}",
    pbChangesAll: "Toutes les modifications récentes +{{points}}",
    pbLockLit: "Modifications récentes faites : verrou allumé sur la rampe integration +{{points}}",
    pbLocked: "Bille {{n}} verrouillée +{{points}}",
    pbKickbackLit: "Checks verts : Rollback allumé +{{points}}",
    pbChecksGreen: "Checks verts +{{points}}",
    pbApproved: "Le Sales Manager valide la release +{{points}}",
    pbSalesManagerNo: "Le Sales Manager : encore une validation d'abord",
    pbKickback: "Rollback !",
    pbSkillShot: "Tir d'adresse +{{points}}",
    pbSuperSkill: "Super tir d'adresse +{{points}}",
    pbBonusXUp: "Bonus x{{n}} +{{points}}",
    pbProduction: "Étage Production +{{points}}",
    pbTimeUp: "Temps écoulé",
    pbTilt: "Tilt",
    pbTiltWarning: "Attention...",
    pbHintPromo0: "Promouvez : la rampe integration",
    pbHintPromo1: "Promouvez : la rampe uat",
    pbHintPromo2: "Promouvez : l'orbite de gauche, preprod",
    pbHintProduction: "La production est ouverte : la rampe du centre",
    pbHintLock: "Verrou allumé : la rampe integration",
    pbHintJackpots: "Déployer partout : integration, uat et preprod sont des jackpots",
    pbHintSuper: "Super jackpot : la rampe production",
    pbHintReleaseDay: "Le jour de release attend au trou Pull Request",
    pbEndOfBall: "Fin de bille",
    pbBonusRamps: "Rampes et orbites : {{n}}",
    pbBonusTargets: "Cibles : {{n}}",
    pbBonusBumpers: "Triggers Apex : {{n}}",
    pbBonusMissions: "Missions : {{n}}",
    pbBonusX: "Multiplicateur x{{n}}",
    pbTilted: "Tilt : pas de bonus pour cette bille",
    pbMissed: "Temps écoulé, mission encore à faire. La règle : {{rule}}"
  }
};

// The HUD pieces that can lie over the table, the margin around a ball (px) and how often it is checked
const COVERS = ".gr-top > *, .gr-corner, .gr-toast, .gr-tipbar, .gr-chat, .gr-hint";
const COVER_MARGIN = 34;
const COVER_EVERY_S = 0.08;

export const CSS = `
.gr-dmd { display: flex; justify-content: center; pointer-events: none; margin: 4px auto 0; width: min(520px, 94vw); }
@media (max-aspect-ratio: 1/1) { .gr-dmd { position: fixed; left: 50%; bottom: 10px; transform: translateX(-50%); width: min(94vw, 460px); margin: 0; z-index: 2; } }
@media (min-aspect-ratio: 5/4) { .gr-dmd { position: fixed; left: 12px; top: 128px; width: min(380px, calc((100vw - 52vh) / 2 - 24px)); margin: 0; } }
.gr-dmd-screen { width: 100%; height: auto; aspect-ratio: 4 / 1; background: #0b0502; border: 3px solid #2b2b33; border-radius: 6px; box-shadow: 0 0 0 2px #0b0b0f, 0 6px 18px rgba(0,0,0,0.5), inset 0 0 18px rgba(255,120,30,0.15); image-rendering: auto; }
.gr-pb { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; justify-content: center; pointer-events: none; }
.gr-pb-pill { background: rgba(3,45,96,0.82); color: #fff; border-radius: 999px; padding: 3px 10px; font-size: 13px; font-weight: 700; white-space: nowrap; }
.gr-pb-pill.is-hot { background: #dd7a01; }
.gr-pb-mission { flex-basis: 100%; display: flex; gap: 8px; align-items: center; justify-content: center; }
.gr-pb-mission[hidden] { display: none; }
.gr-pb-bar { width: 120px; height: 6px; border-radius: 3px; background: rgba(255,255,255,0.25); overflow: hidden; }
.gr-pb-bar > i { display: block; height: 100%; background: #45c65a; }
.gr-pb-stars { letter-spacing: 1px; font-size: 12px; }
.gr-pb-select { position: absolute; left: 50%; top: 42%; transform: translate(-50%, -50%); background: rgba(3,45,96,0.92); color: #fff; border-radius: 12px; padding: 12px 18px; text-align: center; pointer-events: none; max-width: 86%; }
.gr-pb-select[hidden] { display: none; }
.gr-pb-select strong { display: block; font-size: 20px; margin: 4px 0; }
.gr-pb-select span { font-size: 13px; opacity: 0.85; }
.gr-pb-eob { position: absolute; left: 50%; top: 38%; transform: translate(-50%, -50%); background: rgba(255,255,255,0.96); color: #181818; border-radius: 12px; padding: 12px 18px; min-width: 220px; pointer-events: none; box-shadow: 0 6px 24px rgba(0,0,0,0.3); }
.gr-pb-eob[hidden] { display: none; }
.gr-pb-eob h3 { margin: 0 0 6px; font-size: 16px; }
.gr-pb-eob li { display: flex; justify-content: space-between; gap: 16px; font-size: 14px; }
.gr-pb-eob ul { margin: 0; padding: 0; list-style: none; }
.gr-pb-eob .gr-pb-total { border-top: 1px solid #c9c9c9; margin-top: 6px; padding-top: 4px; font-weight: 800; }
.guinea-run[data-world="pinball"] .gr-under-ball { filter: opacity(0.12); transition: filter 0.12s; }
@media (max-aspect-ratio: 1/1) { .guinea-run[data-world="pinball"] .gr-bar { display: none; } }
`;

export function createWorld(ctx) {
  const { THREE, hud, sound, t } = ctx;
  const random = ctx.random;
  const table = buildTable();
  const physics = table.physics;
  const parts = table.parts;
  // Three admins who walk into production, and the author of the monster Flow
  const faces = pickAdmins("pinball", random, 4);
  const view = createView(THREE, ctx, table, {
    faceUrl: (i) => adminFaceUrl(faces[i]),
    flowFaceUrl: adminFaceUrl(faces[3]),
    salesManagerUrl: new URL("../../../../images/bosses/final-boss.svg", import.meta.url).href
  });
  const music = createMusic(sound, THEMES.pinball);
  const fmt = (n) => Math.round(n).toLocaleString(ctx.lang === "fr" ? "fr-FR" : "en-US");
  const point = new THREE.Vector3();
  const overlay = hud.layer.closest(".guinea-run") || hud.layer;
  const ballsOnScreen = new Float64Array(16);
  let coverClock = 0;
  let lastWheek = -10;
  let clock = 0;
  let saveAt = SAVE_EVERY_S;
  let autoplay = null;
  let ended = false;
  const held = { left: false, right: false, plunger: false };
  let pulling = 0;

  const out = {
    say(kind, key, vars, tone) {
      const values = Object.assign({}, vars || {});
      if (values.points !== undefined) {
        values.points = fmt(values.points);
      }
      const text = t(key, values);
      if (DMD_WORDS[key]) {
        const small = values.points !== undefined && values.points !== "0" ? "+" + values.points : values.n !== undefined ? String(values.n) : "";
        dmd.flash(t(DMD_WORDS[key]), small, key === "pbTilt" ? 3 : 1.8);
        if (DMD_ONLY.has(key)) {
          return;
        }
      }
      if (kind === "toast") {
        hud.toast(text, tone || "good");
      } else if (kind === "coach") {
        hud.coach(text, 2400);
      } else if (kind === "tip") {
        hud.tip(text, 0);
      } else if (kind === "chat") {
        if (key === "pbRaidAdmin") {
          // The admin who walks in says it, with their face
          hud.chat({ name: t("pbAdminName"), faceUrl: adminFaceUrl(faces[values.admin] || faces[0]), color: "#032d60" }, text);
        } else {
          hud.chat(key === "pbSickLeave" ? "mariia" : "victor", text);
        }
      }
    },
    sound(name) {
      sound.play(name);
    },
    text: (key) => t(key),
    onBeat: () => Math.abs(music.beat - Math.round(music.beat)) < 0.22,
    event(name, data) {
      switch (name) {
        case "bumper":
          view.flashBumper(data);
          return;
        case "sling":
          view.flashSling(data);
          return;
        case "quality":
          view.pushQuality(data);
          return;
        case "terminal":
          // The command typed on the display, then what it did
          view.terminal();
          dmd.flash(data.cmd, "", 2.8, true);
          return;
        case "flow":
          view.flow(data);
          if (data === "apex") {
            view.show(1.6);
            dmd.flash(t("dmdRefactored"), "", 2);
          }
          return;
        case "validate":
          view.validate();
          dmd.flash(t(data === "start" ? "dmdValidating" : "dmdQuickLit"), "", data === "start" ? 3 : 2.2);
          return;
        case "raid":
          if (data === "start") {
            view.show(0.8);
            dmd.flash(t("dmdRaid"), "", 2.5);
          } else if (data === "caught") {
            dmd.flash(t("dmdCaught"), "", 2);
            celebrate(50);
          }
          return;
        case "spinner":
          view.spin(data);
          return;
        case "rabbit":
          view.rabbitHit();
          return;
        case "salesManager":
          view.salesManagerHit();
          return;
        case "giant":
          view.setGiant(Boolean(data));
          sound.play(data ? "grow" : "shrink");
          return;
        case "flipperHit":
          if (data > 10 && clock - lastWheek > WHEEK_GAP_S) {
            lastWheek = clock;
            sound.play("wheek");
          }
          return;
        case "jackpot":
        case "note":
          celebrate(data === true ? 90 : 50);
          view.show(data === true ? 3 : 1.8);
          return;
        case "multiball":
          if (data) {
            celebrate(60);
            view.show(3);
            music.setSection("chorus");
          }
          return;
        case "mission":
          missionEvent(data);
          return;
        case "level":
          celebrate(120);
          view.show(4);
          return;
        case "select":
          drawSelect(data);
          return;
        case "endOfBall":
          endOfBall(data);
          return;
        case "tilt":
          music.setSection("break");
          return;
        case "match":
          // The number drawn, on the display, as the old tables did
          dmd.flash(t("dmdMatch"), String(data.drawn).padStart(2, "0"), 2.4);
          return;
        case "gameOver":
          gameOver(data);
          return;
        default:
          return;
      }
    }
  };

  const rules = createRules(table, out, random);

  /* ---------- The HUD of the table ---------- */

  // The dot-matrix display, under the top bar
  const dmd = createDmd(hud.extra);
  const select = document.createElement("div");
  select.className = "gr-pb-select";
  select.hidden = true;
  hud.layer.appendChild(select);
  const eob = document.createElement("div");
  eob.className = "gr-pb-eob";
  eob.hidden = true;
  hud.layer.appendChild(eob);
  let eobTimer = 0;
  let lastTop = "";
  let lastGoal = "";
  // Once a game: the score passes the fifth of the Hall of Fame
  let topFlashed = false;

  function drawPanel(dt) {
    const h = rules.hud();
    const top = h.score + "|" + h.ballNo;
    if (top !== lastTop) {
      lastTop = top;
      ctx.bonus.hud({ score: fmt(h.score), ball: t("pbBall", { n: h.ballNo }) });
    }
    const status = h.hurry ? t("dmdHurry") + " " + fmt(h.hurry) : [t("pbBall", { n: h.ballNo }) + (h.extraBalls ? " +" + h.extraBalls : ""), t("pbLevel", { n: h.level }), h.bonusX > 1 ? "x" + h.bonusX : ""].filter(Boolean).join("  ");
    const mission = h.mission === null ? "" : h.mission === "wizard" ? t("pbNameWizard") : t("pbShort" + h.mission);
    let goal = "";
    if (h.mission !== null && h.goal) {
      const total = GOAL_TOTALS[h.goal[0]];
      goal = total ? h.goal[1].n + " / " + total : t("dmdGo");
    }
    if (!topFlashed && ctx.hofTarget > 0 && h.score > ctx.hofTarget) {
      topFlashed = true;
      out.say("toast", "pbTop5");
      out.sound("pbJackpot");
      ctx.setData("pb-top5", 1);
    }
    const time = h.flips !== null && h.flips !== undefined ? h.flips + " " + t("dmdFlips") : h.timeLeft + "s";
    dmd.update(dt || 0, { score: fmt(h.score), status: status.toUpperCase(), mission: mission.toUpperCase(), time: time.toUpperCase(), goal });
    const text = h.goal ? t(h.goal[0], h.goal[1]) : "";
    if (text !== lastGoal) {
      lastGoal = text;
      hud.goal(text);
    }
  }

  const missionLength = {};
  function missionTotal(id) {
    if (!missionLength[id] || rules.state.mission.m.timeLeft > missionLength[id]) {
      missionLength[id] = rules.state.mission.m.timeLeft;
    }
    return missionLength[id];
  }

  function drawSelect(id) {
    if (id < 0) {
      select.hidden = true;
      return;
    }
    select.replaceChildren();
    const title = document.createElement("span");
    title.textContent = t("pbSelectTitle");
    const name = document.createElement("strong");
    name.textContent = id + " · " + t("pbName" + id);
    const rule = document.createElement("span");
    rule.textContent = t("w" + id + "_rule");
    select.append(title, name, rule);
    select.hidden = false;
  }

  function missionEvent(data) {
    if (data.started) {
      missionLength[data.id] = 0;
      if (data.id !== "wizard") {
        // The rule of the world the mission comes from, while it plays
        hud.tip(t("w" + data.id + "_rule"), readingMs(t("w" + data.id + "_rule")));
      } else {
        celebrate(80);
        music.setSection("bridge");
      }
      return;
    }
    if (data.ok) {
      celebrate(50);
      view.show(2.2);
      ctx.pig.hop();
      return;
    }
    if (data.id !== "wizard" && data.why === "pbTimeUp") {
      hud.tip(t("pbMissed", { rule: t("w" + data.id + "_rule") }), 0);
    }
  }

  function endOfBall(data) {
    eob.replaceChildren();
    const h = document.createElement("h3");
    h.textContent = t("pbEndOfBall");
    const list = document.createElement("ul");
    for (const line of data.lines) {
      const li = document.createElement("li");
      const a = document.createElement("span");
      a.textContent = t(line.key, { n: line.n });
      const b = document.createElement("span");
      b.textContent = fmt(line.points);
      li.append(a, b);
      list.appendChild(li);
    }
    const total = document.createElement("li");
    total.className = "gr-pb-total";
    const a = document.createElement("span");
    a.textContent = data.tilted ? t("pbTilted") : t("score");
    const b = document.createElement("span");
    b.textContent = fmt(data.total);
    total.append(a, b);
    list.appendChild(total);
    eob.append(h, list);
    eob.hidden = false;
    sound.play("pbDrain");
    window.clearTimeout(eobTimer);
    eobTimer = window.setTimeout(() => (eob.hidden = true), 2700);
  }

  function celebrate(count) {
    const b = physics.balls.find((x) => x.active) || { x: 0, y: 8, floor: 0 };
    view.worldPoint(b.x, b.y, b.floor, point);
    ctx.fx.burst(point.x, point.y, point.z, { count, speed: 5, up: 5, life: 1.3 });
    ctx.pig.hop();
  }

  function gameOver(summary) {
    if (ended) {
      return;
    }
    ended = true;
    clearCovers();
    ctx.bonus.clearCheckpoint();
    sound.play("happy");
    ctx.bonus.over(summary);
  }

  /** What the lights play over the rules: the attract chase while the first launch waits, dark when tilted. */
  function mood() {
    const s = rules.state;
    return { attract: s.saveArmed && Boolean(physics.ballOnPlunger()), tilted: s.tilted };
  }

  /* ---------- The guinea pig watches from its stand over the right side, as the arcade toys do ---------- */

  function placePig() {
    view.worldPoint(5.45, 15.1, 0, point);
    ctx.pig.object.position.set(point.x, point.y + 0.7, point.z);
    ctx.pig.object.rotation.set(0, Math.PI * 1.2, 0);
    ctx.pig.object.scale.setScalar(0.65);
    ctx.pig.shadow.visible = false;
    ctx.pig.state = { running: false };
  }

  /* ---------- The HUD over the table: what the ball passes under fades, so nothing hides it ---------- */

  function uncover(dt) {
    coverClock += dt;
    if (coverClock < COVER_EVERY_S) {
      return;
    }
    coverClock = 0;
    const frame = hud.layer.getBoundingClientRect();
    let count = 0;
    for (let i = 0; i < physics.balls.length; i++) {
      if (view.ballPoint(i, point)) {
        point.project(ctx.camera);
        ballsOnScreen[count++] = frame.left + ((point.x + 1) / 2) * frame.width;
        ballsOnScreen[count++] = frame.top + ((1 - point.y) / 2) * frame.height;
      }
    }
    for (const el of overlay.querySelectorAll(COVERS)) {
      const box = el.getBoundingClientRect();
      let under = false;
      // An empty box (no chat bubble yet) hides nothing
      const shows = box.width > 0 && el.textContent.trim() !== "";
      for (let k = 0; k < count && !under && shows; k += 2) {
        const x = ballsOnScreen[k];
        const y = ballsOnScreen[k + 1];
        under = x > box.left - COVER_MARGIN && x < box.right + COVER_MARGIN && y > box.top - COVER_MARGIN && y < box.bottom + COVER_MARGIN;
      }
      el.classList.toggle("gr-under-ball", under);
    }
  }

  function clearCovers() {
    for (const el of overlay.querySelectorAll(".gr-under-ball")) {
      el.classList.remove("gr-under-ball");
    }
  }

  /* ---------- Checkpoint ---------- */

  function saveNow() {
    if (!ended && !rules.over && !ctx.params.testMode) {
      ctx.bonus.saveCheckpoint(rules.snapshot());
    }
  }

  function onHide() {
    if (document.hidden) {
      saveNow();
    }
  }
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("pagehide", saveNow);

  /* ---------- Controls ---------- */

  function flipper(side, down) {
    const which = side < 0 ? "left" : "right";
    if (held[which] === down) {
      return;
    }
    held[which] = down;
    const lower = side < 0 ? parts.flippers.left : parts.flippers.right;
    const upper = side < 0 ? parts.flippers.upperLeft : parts.flippers.upperRight;
    if (lower.enabled) {
      sound.play(down ? "pbFlipper" : "pbFlipperDown");
      if (down) {
        rules.flip(side);
      }
    }
    lower.held = down;
    upper.held = down;
    // The third flipper, on the right bank, moves with the right button
    if (side > 0) {
      parts.flippers.third.held = down;
    }
  }

  function plunger(down) {
    if (down) {
      if (!held.plunger && physics.ballOnPlunger()) {
        held.plunger = true;
        pulling = 0;
      }
      return;
    }
    if (held.plunger) {
      held.plunger = false;
      if (physics.releasePlunger()) {
        rules.launched();
        sound.play("pbKick");
      }
    }
  }

  /** The right flipper doubles as the plunger while the only ball waits on it. */
  function rightIsPlunger() {
    return physics.activeBalls() === 1 && Boolean(physics.ballOnPlunger());
  }

  function nudge() {
    const strength = rules.nudge();
    if (strength > 0) {
      physics.nudge((random() - 0.5) * NUDGE_SPEED, NUDGE_SPEED * strength);
      view.shake && view.shake();
    }
  }

  function exposeHooks() {
    if (!window.__guineaRun) {
      return;
    }
    window.__guineaRun.pinball = {
      autoplay(on) {
        autoplay = on === false ? null : createAutoplay(table, random);
      },
      hud: () => rules.hud(),
      state: () => rules.state,
      balls: () => physics.balls.filter((b) => b.active).map((b) => ({ x: b.x, y: b.y, floor: b.floor, mode: b.mode })),
      flippers: () => ({ left: parts.flippers.left.held, right: parts.flippers.right.held }),
      snapshot: () => rules.snapshot(),
      // A check reaches a moment of the table directly: 1 multiball, 2 a mission, 3 the Production floor, 4 Release day, 5 level 3
      jump: (step, mission) => jump(step, mission)
    };
  }

  function jump(step, mission) {
    const s = rules.state;
    if (step === 1) {
      s.locks = 2;
      s.lockLit = true;
      const ball = physics.balls.find((b) => b.active) || physics.addBall(-3.0, 9.0, 0, 30, 0);
      physics.sendOnPath(ball, parts.paths.integration, 40);
    } else if (step === 2) {
      s.select = mission || 0;
      const ball = physics.balls.find((b) => b.active);
      if (ball) {
        ball.mode = "table";
        ball.x = TABLE.scoop.x;
        ball.y = TABLE.scoop.y - 0.6;
        ball.vx = 0;
        ball.vy = 4;
      }
    } else if (step === 3) {
      s.promo = 3;
      const ball = physics.balls.find((b) => b.active);
      if (ball) {
        physics.sendOnPath(ball, parts.paths.production, 60);
      }
    } else if (step === 4) {
      s.done = s.done.map(() => true);
      s.select = 0;
      const ball = physics.balls.find((b) => b.active);
      if (ball) {
        ball.mode = "table";
        ball.x = TABLE.scoop.x;
        ball.y = TABLE.scoop.y - 0.6;
        ball.vx = 0;
        ball.vy = 4;
      }
    } else if (step === 5) {
      s.level = 3;
    }
  }

  return {
    /** options.resume: a saved state to go on from, or nothing for a new game. */
    start(options) {
      ctx.engine.scene.background = new THREE.Color(0x061a33);
      ctx.engine.scene.fog = null;
      placePig();
      if (options && options.resume) {
        rules.restore(options.resume);
      } else {
        rules.newGame();
      }
      exposeHooks();
      const at = ctx.params.startAt;
      if (at > 0) {
        // Let the first ball onto the table, then jump
        window.setTimeout(() => {
          const ball = physics.ballOnPlunger();
          if (ball) {
            ball.vy = 30;
            rules.launched();
          }
          jump(at, ctx.params.seed % 10);
        }, 300);
      }
      music.start();
      view.update(0, rules.lights, mood());
      view.snapCamera();
      drawPanel();
    },
    update(dt) {
      if (ended) {
        view.update(dt, rules.lights, mood());
        return;
      }
      clock += dt;
      if (autoplay) {
        autoplay.step(dt, {
          press: (f) => {
            sound.play("pbFlipper");
            rules.flip(f.side);
          },
          release() {},
          launched: () => rules.launched()
        });
      }
      if (held.plunger) {
        pulling = Math.min(1, pulling + dt / PULL_S);
        physics.pullPlunger(pulling);
      }
      // A ball out of sight below the Production floor waits for the view to come back
      physics.freezeOutOfSight(view.sight);
      physics.advance(dt);
      physics.readEvents(rules.event);
      rules.update(dt);
      music.update(dt);
      view.update(dt, rules.lights, mood());
      placePig();
      uncover(dt);
      drawPanel(dt);
      if (clock >= saveAt) {
        saveAt = clock + SAVE_EVERY_S;
        saveNow();
      }
    },
    /** A key or a touch held or let go: left, right, plunger, nudge. */
    hold(name, down) {
      if (ended) {
        return;
      }
      if (name === "left") {
        flipper(-1, down);
      } else if (name === "right") {
        if (down && rightIsPlunger()) {
          plunger(true);
          return;
        }
        if (!down && held.plunger) {
          plunger(false);
          return;
        }
        flipper(1, down);
      } else if (name === "plunger") {
        plunger(down);
      } else if (name === "nudge" && down) {
        nudge();
      }
    },
    action(name) {
      // Tapped pads or menu keys: the table only takes held keys
      if (name === "confirm" && physics.ballOnPlunger()) {
        plunger(true);
        window.setTimeout(() => plunger(false), 450);
      }
    },
    /** The shell paused the game: save it now. */
    pause() {
      for (const name of ["left", "right"]) {
        if (held[name]) {
          flipper(name === "left" ? -1 : 1, false);
        }
      }
      saveNow();
    },
    idleCamera() {
      view.placeCamera(0);
    },
    dispose() {
      saveNow();
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", saveNow);
      window.clearTimeout(eobTimer);
      music.dispose();
      view.dispose();
      dmd.dispose();
      clearCovers();
      select.remove();
      eob.remove();
      ctx.pig.object.scale.setScalar(1);
      ctx.pig.shadow.visible = true;
      if (window.__guineaRun && window.__guineaRun.pinball) {
        delete window.__guineaRun.pinball;
      }
    }
  };
}
