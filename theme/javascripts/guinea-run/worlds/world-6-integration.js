/*
 * World 6, Deploy to the integration org: a musical run along the deployment
 * job. The guinea pig runs to the music, the player only jumps, and the track
 * is the deployment log in its five parts: authentication, the package, the
 * pre-deployment actions, the Salesforce deployment, the post-deployment
 * actions.
 *
 * The track is built from the plan the player declared in world 3:
 * - the manual action declared before the deployment is a button to press on
 *   the way (or at the barrier, with a jump): Mark as done
 * - an action declared in the wrong place fails with its real error, as a
 *   block to jump over
 * - the backfill declared after the deployment turns the 30 accounts nobody
 *   can save into green checks; without it they stay, as blocks
 *
 * The bosses: the .forceignore fog of Romain Panda's US-056 (the deployment
 * log shows the walls it hides), the green lie (a green deployment, and 30
 * accounts nobody can save), and the three failed actions of Mariia's US-062,
 * each with its own way out, chosen on the beat.
 *
 * Then the Dev "works on my sandbox" (one of the twenty-one faces, a different
 * one at each play): standing in his sandbox, he deploys from it straight
 * into the integration org with sf project deploy start, and throws the
 * components he never committed on the beat. The guinea pig jumps them, and
 * the Pull Requests on the track make the pipeline fire what is in git back
 * at him (musical.js bossRounds and createBossBlaster, as world 8). A player
 * out of hearts at him starts the next try at him.
 */
import { createLevel, createMusicalRun, MUSICAL_TEXTS, MUSICAL_CSS, endMissedInfo, musicalWorld, bossRounds, createBossBlaster } from "./musical.js";
import { melody } from "../core/music.js";
import { SLDS } from "../core/painter.js";
import { pickAdmins, adminFaceUrl } from "../core/faces.js";
import { createDevFigure, createDevBar, createDevSpeech, DEV_CSS, DEV_HEAD_R } from "../core/dev.js";

export const PADS = ["jump"];
// The mode is the tempo of the song (musical.js): the shell leaves the time as it is
export const OWN_SPEED = true;
// The salesforce items (components, checks, runners, orgs, the Cloudity logo), the Kenney
// springs, trees and bushes far behind, and the bonus vegetables
export const MODELS = ["salesforce", "platform", "nature", "vegetables"];

// Behind the track: trees, then the CI runners and the orgs, every row on the beat
const SCENERY = [
  { names: ["tree_default", "tree_oak", "tree_pineRoundA"], z: -4.6, depth: 1.6, every: 5.2, height: 3.2, bounce: 0.05 },
  // The CI runners of the pipeline, along the track, and the orgs in the sky
  { names: ["ci-runner"], z: -6.9, every: 9, height: 2.3, bounce: 0.04, turn: 0.4 },
  { names: ["org-cloud"], y: 7.5, rise: 2.5, z: -15, every: 19, height: 2.6, bounce: 0.02, turn: 0.3 }
];

const SONG = {
  bpm: 108,
  // F major: I V vi IV, the happiest four chords there are
  root: 65,
  progression: [0, 4, 5, 3],
  lead: {
    chorus: melody("4..4..2.4.5.4.2. 6..6..4.6.8.6.4. 9.8.7.5.7...5.4. 3..3..5.4......."),
    // The Dev's theme: the same chords in a hurry, a lead that keeps deploying
    dev: melody("0.0.4.0.5.4.2.0. 3.3.5.3.7.5.4.2. 5.5.7.5.9.7.5.4. 4.2.0.2.4...2...")
  },
  sections: {
    // The Dev: the band in a hurry, a snare on the backbeat and a busy bass
    dev: {
      kick: "X..xX...X..xX...",
      snare: "....X.......X...",
      hat: "x.xxx.xxx.xxx.xx",
      open: "..x...x...x...x.",
      bass: "x.x.xox.x.x.xox.",
      stab: "...x...x...x...x",
      arp: true,
      lead: "dev"
    }
  },
  start: "intro",
  end: "lounge"
};

const BAR = 4;

/* ---------- The boss: the Dev "works on my sandbox" ---------- */

// After the choice of US-062: a bar for him to walk in, then three rounds of four bars
const BOSS_BAR = 49;
const ROUND_BARS = 4;
// A round per line, a bar per string, a beat per character: x a component thrown
// on the beat, c a Pull Request on the ground. A round after a checkpoint starts
// with three free beats, so nothing lands on a guinea pig that just came back
const ROUNDS = [
  ["x...", "x.c.", ".x.x", "x..."],
  ["...x", "x.c.", "x.x.", ".xx."],
  ["...x", "x.c.", "xx.x", "x.x."]
];
// Three Pull Requests of sixteen components: two are not enough, three are
const DEV_HP = 40;
const BLASTER_BEATS = 8;
const SHOTS_PER_BEAT = 2;
const SHOT_BEATS = 0.75;
// What he never committed, in turn
const DEV_PARTS = ["flow", "field", "profile", "debug", "layout", "perm"];
// What the pipeline fires back: the components of US-014, from git
const PIPE_SHOTS = ["custom-field", "permission-set", "apex", "lwc"];
const PIPE_COLORS = [0x0176d3, 0x06a59a, 0x9050e9, 0xe3066a];
// Where he stands, from the camera: right of the guinea pig, behind the track
const DEV_DESK = { dx: 5.4, z: -3.6, scale: 1.1 };
const DEV_PHONE = { dx: 2.4, z: -6.5, scale: 1.35 };
// A player out of hearts at the Dev starts the next try at him, within this long.
// Kept by the module, which outlives a world (the shell builds a new one for each try)
const DEV_RETRY_MS = 15 * 60000;
let devRetry = null;

export const TEXTS = {
  en: Object.assign({}, MUSICAL_TEXTS.en, {
    intro: "Your Pull Request is merged into the integration branch and the deployment job starts. Run through the log in its five parts, to the music.",
    how1: "Jump with Up, Space or a tap when the ring closes",
    how2: "Eat the vegetables, press Mark as done on the way",
    how3: "Read the log: it shows what the fog hides",
    note: "Victor knew this org. Victor has left. Read the log, it knows more than I did. - V.",
    path0: "Auth",
    path1: "Package",
    path2: "Pre-deploy",
    path3: "Deploy",
    path4: "Post-deploy",
    arch0: "1 · Authentication",
    arch1: "2 · Package",
    arch2: "3 · Pre-deploy",
    arch3: "4 · Deployment",
    arch4: "5 · Post-deploy",
    goal0: "Part 1 of the log: authentication. Jump the red blocks",
    goal1: "Part 2: the package. Collect its components",
    goal2: "Part 3: the pre-deploy actions",
    goal2manual: "Part 3: press Mark as done on the way",
    goal3: "Part 4: the deployment. Jump for Quick Deploy",
    goal3fog: "Jump for the deployment log: it shows the hidden walls",
    goal4: "Part 5: the post-deploy actions",
    goal5: "Pick the way out of each failed action",
    goal6: "Verify in the org, not in the log",
    coachArc: "Pink rings are for fun: jump for the vegetables!",
    coachPackage: "1 file in your Pull Request, about sixty in the package: delta is off",
    coachQuick: "Quick Deploy: the check already ran the tests",
    coachLog: "Jump for the log: it shows what .forceignore hides!",
    coachFogOut: "Tier_* also matched Tier_Updated__c: name the file exactly",
    coachGreen: "Green is not working: look at the records",
    meter: "Components: {{n}}",
    p_auth: "Part 1 of the log says auth URL. On the preprod and main branches it says JWT.",
    p_quick: "Deployment mode: FULL + Quick Deploy",
    p_log: "Deployment log read: the walls .forceignore hid show up",
    o_auth: "No authentication found for org integration",
    o_auth_tip: "The SFDX_AUTH_URL_INTEGRATION secret is missing or wrong: it must start with force://.",
    o_empty: "The log says nothing to deploy",
    o_empty_tip: "With delta off it should not happen: check that manifest/package.xml is still in the branch and still lists something.",
    o_tests: "Apex tests ran again",
    o_tests_tip: "The check of the Pull Request already validated this package, tests included. The merge job applies that validation: Quick Deploy.",
    o_fog: "no CustomField named Account.Tier_Updated__c found",
    o_fog_tip: "A .forceignore line is a pattern: Tier_*.field-meta.xml also hid Tier_Updated__c, a field the release needs. Read the log, then name the file exactly.",
    o_drift: "The org drifted",
    o_drift_tip: "Somebody changed the org by hand, and the deployment overwrote it without a word: nothing compares.",
    o_record: "We hit a snag. Review the following fields: Customer Tier",
    o_record_tip: "Salesforce enforces a required field on save, not on the data already there. Ship a backfill as a post-deployment Apex action.",
    o_prebackfill: "Invalid type: AccountTierBackfill",
    o_prebackfill_tip: "The Apex action ran before the deployment: the class only exists once the metadata is deployed. Declare it After Metadata Deployment.",
    o_prerefdata: "{Tier_Threshold__c} is missing in the Target",
    o_prerefdata_tip: "The data import ran before the field it fills was deployed. Declare it after the deployment.",
    o_preschedule: "Invalid type: AccountTierBatch",
    o_preschedule_tip: "The batch was scheduled before its class was deployed. Declare it after the deployment, after the data it reads.",
    o_latemanual: "Deliverability was declared too late",
    o_latemanual_tip: "Set Email Deliverability to All Email must happen with the org as it was: Before Metadata Deployment.",
    o_lateorder: "Scheduled before its data",
    o_lateorder_tip: "Load the reference data first, then schedule the batch that reads it.",
    s_auth: "No auth",
    s_empty: "nothing to deploy",
    s_invalid: "Invalid type",
    s_target: "Missing in Target",
    s_tests: "Apex tests",
    s_fog: "Tier_*",
    s_drift: "Changed by hand",
    s_record: "Can't save",
    s_late: "Too late",
    s_order: "Wrong order",
    s_authurl: "auth URL",
    s_quick: "Quick Deploy",
    s_log: "Deployment log",
    s_delta: "Delta: Disabled",
    s_refdata: "12 records",
    stopHeader: "1 to do by hand",
    stopButton: "Mark as done",
    stopDone: "Set Email Deliverability to All Email: done",
    stopOnTheWay: "Pressed on the way: the release did not even wait",
    choiceHeader: "US-062: 1 failed",
    romainFog: "# My scratch test fields, never versioned. That wildcard was mine, sorry.",
    fogTick: "**/objects/Account/fields/Tier_*.field-meta.xml",
    greenLie: "Deployment succeeded. All checks passed.",
    greenLieTwist: "30 accounts can no longer be saved",
    backfillRuns: "Customer Tier backfill started: the accounts save again",
    backfillMissing: "No backfill declared: jump the records nobody can save",
    mariiaFail: "My three actions run after the merge only: the check never ran them. Pick the right way out for each.",
    failTick: "System.QueryException: List has no rows for assignment to SObject",
    r1: "Add sales managers to the Key Accounts group: failed",
    r1d: "The action is right, the org had no group. Now the Key_Accounts group exists.",
    r2: "Recalculate account scores once: failed",
    r2d: "The action is wrong: it calls the class AccountScoreBach, a typo.",
    r3: "Add the deployment user to the Key Accounts group: stopped",
    r3d: "You already did it by hand in Setup.",
    optRetry: "Retry",
    optFix: "Move to a fix Pull Request",
    optDone: "Mark as done",
    optRerun: "Re-run the job",
    l1: "The org was missing something, now it has it: Retry",
    l2: "The action itself is wrong: a fix Pull Request",
    l3: "Done by hand: Mark as done",
    tRerun: "Re-running the job deploys everything again. Each failed action has its own way out.",
    t1fix: "Nothing to fix: the action is right. Retry it.",
    t1done: "Nobody did it by hand: Retry it.",
    t2retry: "Retry fails every time: the class name is wrong. Fix Pull Request.",
    t2done: "Nothing ran: the action is wrong. Fix Pull Request.",
    t3retry: "Already done by hand: Mark as done.",
    t3fix: "The action is right and already done: Mark as done.",
    endSign: "the integration org",
    arrived: "US-014 is in the integration org, and it works: Acme Corp shows Customer Tier: Gold.",
    info_coins: "You ate {{got}} of {{total}} vegetables.",
    info_log: "You did not read the deployment log: it names the .forceignore line that hid Account.Tier_Updated__c.",
    info_quick: "You missed Quick Deploy: the check already ran the tests, so the merge job takes seconds.",
    info_backfill: "No backfill after the deployment in World 3: 30 accounts could not be saved until it ran.",
    info_misplaced: "{{n}} deployment actions sat in the wrong place in World 3, and failed here.",
    goalDev: "Jump his components, grab the Pull Requests",
    devName: "Dev",
    devTick: "sf project deploy start --source-dir force-app --target-org integration",
    sayIn: "Works on my sandbox! I deploy it myself: sf project deploy start.",
    sayHit: "Hey, my Flow was not in git yet!",
    sayAgain: "Again! It worked on my sandbox!",
    sayDown: "OK... next time I commit it, and the pipeline deploys it.",
    d_flow: "MyTestFlow",
    d_field: "Temp_Field__c",
    d_profile: "Admin profile",
    d_debug: "DebugUtils.cls",
    d_layout: "Old layout",
    d_perm: "View All Data",
    d_title: "In no commit: {{name}}",
    d_tip: "A component deployed from a sandbox is in no commit: nobody reviewed it, and the next deployment from git overwrites it or leaves it behind. Commit it, open a Pull Request, let the pipeline deploy.",
    s_pipeline: "Pull Request",
    p_pipeline: "Pull Request merged: the pipeline deploys what is in git",
    coachPipeline: "Run into the Pull Request: the pipeline fires back!",
    coachDevAgain: "He is still deploying: the round again",
    devBeaten: "The pipeline deployed what is in git",
    retryHint: "Try again starts at the Dev.",
    retryBoss: "Straight back to the Dev: the deployment is done"
  }),
  fr: Object.assign({}, MUSICAL_TEXTS.fr, {
    intro: "Votre Pull Request est mergée dans la branch integration et le job de déploiement démarre. Traversez le log en cinq parties, en musique.",
    how1: "Sautez avec Haut, Espace ou en touchant quand l'anneau se referme",
    how2: "Mangez les légumes, appuyez sur Mark as done en passant",
    how3: "Lisez le log : il montre ce que cache le brouillard",
    note: "Victor connaissait cette org. Victor est parti. Lisez le log, il en sait plus que moi. - V.",
    path0: "Auth",
    path1: "Package",
    path2: "Pre-deploy",
    path3: "Déploiement",
    path4: "Post-deploy",
    arch0: "1 · Authentification",
    arch1: "2 · Package",
    arch2: "3 · Pre-deploy",
    arch3: "4 · Déploiement",
    arch4: "5 · Post-deploy",
    goal0: "Partie 1 du log : l'authentification. Sautez les blocs rouges",
    goal1: "Partie 2 : le package. Ramassez ses composants",
    goal2: "Partie 3 : les actions pre-deploy",
    goal2manual: "Partie 3 : appuyez sur Mark as done en passant",
    goal3: "Partie 4 : le déploiement. Sautez pour le Quick Deploy",
    goal3fog: "Sautez pour le log de déploiement : il montre les murs cachés",
    goal4: "Partie 5 : les actions post-deploy",
    goal5: "Choisissez la sortie de chaque action en échec",
    goal6: "Vérifiez dans l'org, pas dans le log",
    coachArc: "Les anneaux roses, c'est pour le plaisir : sautez pour les légumes !",
    coachPackage: "1 fichier dans votre Pull Request, une soixantaine dans le package : le delta est désactivé",
    coachQuick: "Quick Deploy : le contrôle a déjà exécuté les tests",
    coachLog: "Sautez pour le log : il montre ce que cache .forceignore !",
    coachFogOut: "Tier_* attrapait aussi Tier_Updated__c : nommez le fichier exactement",
    coachGreen: "Vert ne veut pas dire que ça marche : regardez les enregistrements",
    meter: "Composants : {{n}}",
    p_auth: "La partie 1 du log dit auth URL. Sur les branches preprod et main, elle dit JWT.",
    p_quick: "Deployment mode: FULL + Quick Deploy",
    p_log: "Log de déploiement lu : les murs cachés par .forceignore apparaissent",
    o_auth: "No authentication found for org integration",
    o_auth_tip: "Le secret SFDX_AUTH_URL_INTEGRATION manque ou est faux : il doit commencer par force://.",
    o_empty: "Le log dit nothing to deploy",
    o_empty_tip: "Avec le delta désactivé, ça ne devrait pas arriver : vérifiez que manifest/package.xml est toujours dans la branch et liste toujours quelque chose.",
    o_tests: "Les tests Apex ont tourné à nouveau",
    o_tests_tip: "Le contrôle de la Pull Request a déjà validé ce package, tests compris. Le job du merge applique cette validation : le Quick Deploy.",
    o_fog: "no CustomField named Account.Tier_Updated__c found",
    o_fog_tip: "Une ligne de .forceignore est un motif : Tier_*.field-meta.xml cachait aussi Tier_Updated__c, un champ dont la release a besoin. Lisez le log, puis nommez le fichier exactement.",
    o_drift: "L'org a dérivé",
    o_drift_tip: "Quelqu'un a modifié l'org à la main, et le déploiement l'a écrasée sans un mot : rien ne compare.",
    o_record: "We hit a snag. Review the following fields: Customer Tier",
    o_record_tip: "Salesforce impose un champ obligatoire à l'enregistrement, pas sur les données déjà là. Livrez un backfill en action Apex post-deployment.",
    o_prebackfill: "Invalid type: AccountTierBackfill",
    o_prebackfill_tip: "L'action Apex s'est exécutée avant le déploiement : la classe n'existe qu'une fois les metadata déployées. Déclarez-la After Metadata Deployment.",
    o_prerefdata: "{Tier_Threshold__c} is missing in the Target",
    o_prerefdata_tip: "L'import de données s'est exécuté avant le déploiement du champ qu'il remplit. Déclarez-le après le déploiement.",
    o_preschedule: "Invalid type: AccountTierBatch",
    o_preschedule_tip: "Le batch a été planifié avant le déploiement de sa classe. Déclarez-le après le déploiement, après les données qu'il lit.",
    o_latemanual: "Délivrabilité déclarée trop tard",
    o_latemanual_tip: "Set Email Deliverability to All Email doit se faire avec l'org telle qu'elle était : Before Metadata Deployment.",
    o_lateorder: "Planifié avant ses données",
    o_lateorder_tip: "Chargez d'abord les données de référence, puis planifiez le batch qui les lit.",
    s_auth: "Pas d'auth",
    s_empty: "nothing to deploy",
    s_invalid: "Invalid type",
    s_target: "Missing in Target",
    s_tests: "Tests Apex",
    s_fog: "Tier_*",
    s_drift: "Modifié à la main",
    s_record: "Bloqué",
    s_late: "Trop tard",
    s_order: "Mauvais ordre",
    s_authurl: "auth URL",
    s_quick: "Quick Deploy",
    s_log: "Log de déploiement",
    s_delta: "Delta : Disabled",
    s_refdata: "12 enregistrements",
    stopHeader: "1 to do by hand",
    stopButton: "Mark as done",
    stopDone: "Set Email Deliverability to All Email : fait",
    stopOnTheWay: "Appuyé en passant : la release n'a même pas attendu",
    choiceHeader: "US-062 : 1 en échec",
    romainFog: "# My scratch test fields, never versioned. Ce joker était le mien, désolé.",
    fogTick: "**/objects/Account/fields/Tier_*.field-meta.xml",
    greenLie: "Déploiement réussi. Tous les contrôles sont passés.",
    greenLieTwist: "30 comptes ne peuvent plus être enregistrés",
    backfillRuns: "Backfill de Customer Tier démarré : les comptes s'enregistrent à nouveau",
    backfillMissing: "Pas de backfill déclaré : sautez les enregistrements que personne ne peut sauver",
    mariiaFail: "Mes trois actions ne tournent qu'après le merge : le contrôle ne les a jamais exécutées. Choisissez la bonne sortie pour chacune.",
    failTick: "System.QueryException: List has no rows for assignment to SObject",
    r1: "Ajouter les sales managers au groupe Key Accounts : en échec",
    r1d: "L'action est juste, il manquait le groupe à l'org. Le groupe Key_Accounts existe maintenant.",
    r2: "Recalculer une fois le score des comptes : en échec",
    r2d: "L'action est fausse : elle appelle la classe AccountScoreBach, une faute de frappe.",
    r3: "Ajouter l'utilisateur de déploiement au groupe Key Accounts : arrêtée",
    r3d: "Vous l'avez déjà fait à la main dans Setup.",
    optRetry: "Retry",
    optFix: "Pull Request de correction",
    optDone: "Mark as done",
    optRerun: "Relancer le job",
    l1: "Il manquait quelque chose à l'org, elle l'a désormais : Retry",
    l2: "L'action elle-même est fausse : une Pull Request de correction",
    l3: "Fait à la main : Mark as done",
    tRerun: "Relancer le job redéploie tout. Chaque action en échec a sa propre sortie.",
    t1fix: "Rien à corriger : l'action est juste. Retry.",
    t1done: "Personne ne l'a faite à la main : Retry.",
    t2retry: "Retry échoue à chaque fois : le nom de classe est faux. Pull Request de correction.",
    t2done: "Rien n'a tourné : l'action est fausse. Pull Request de correction.",
    t3retry: "Déjà fait à la main : Mark as done.",
    t3fix: "L'action est juste et déjà faite : Mark as done.",
    endSign: "l'org d'integration",
    arrived: "US-014 est dans l'org d'integration, et ça marche : Acme Corp affiche Customer Tier: Gold.",
    info_coins: "Vous avez mangé {{got}} légumes sur {{total}}.",
    info_log: "Vous n'avez pas lu le log de déploiement : il nomme la ligne de .forceignore qui cachait Account.Tier_Updated__c.",
    info_quick: "Vous avez raté le Quick Deploy : le contrôle a déjà exécuté les tests, donc le job du merge prend quelques secondes.",
    info_backfill: "Pas de backfill après le déploiement dans le Monde 3 : 30 comptes ne pouvaient plus être enregistrés tant qu'il n'avait pas tourné.",
    info_misplaced: "{{n}} actions de déploiement étaient mal placées dans le Monde 3, et ont échoué ici.",
    goalDev: "Sautez ses composants, prenez les Pull Requests",
    devName: "Dev",
    devTick: "sf project deploy start --source-dir force-app --target-org integration",
    sayIn: "Ça marche sur ma sandbox\u00a0! Je déploie moi-même\u00a0: sf project deploy start.",
    sayHit: "Hé, mon flow n'était pas encore dans git\u00a0!",
    sayAgain: "Encore\u00a0! Ça marchait sur ma sandbox\u00a0!",
    sayDown: "OK... la prochaine fois je le commite, et le pipeline le déploie.",
    d_flow: "MyTestFlow",
    d_field: "Temp_Field__c",
    d_profile: "Profil Admin",
    d_debug: "DebugUtils.cls",
    d_layout: "Ancienne présentation",
    d_perm: "View All Data",
    d_title: "Dans aucun commit : {{name}}",
    d_tip: "Un composant déployé depuis une sandbox n'est dans aucun commit : personne ne l'a relu, et le prochain déploiement depuis git l'écrase ou le laisse traîner. Commitez-le, ouvrez une Pull Request, laissez le pipeline déployer.",
    s_pipeline: "Pull Request",
    p_pipeline: "Pull Request mergée : le pipeline déploie ce qui est dans git",
    coachPipeline: "Foncez dans la Pull Request : le pipeline riposte !",
    coachDevAgain: "Il déploie encore : la manche recommence",
    devBeaten: "Le pipeline a déployé ce qui est dans git",
    retryHint: "Réessayer reprend au dev.",
    retryBoss: "Retour direct au dev : le déploiement est fait"
  })
};

/** The product words and error texts taken word for word from the labs, checked by scripts/verify/check-easter-egg.mjs. */
export const QUOTES = [
  { lab: "1.6", text: "No authentication found for org integration" },
  { lab: "2.3", text: "We hit a snag" },
  { lab: "2.3", text: "Invalid type" },
  { lab: "2.4", text: "is missing in the Target" },
  { lab: "2.4", text: "Mark as done" },
  { lab: "2.4", text: "1 to do by hand" },
  { lab: "2.4", text: "Set Email Deliverability to All Email" },
  { lab: "3.3", text: "List has no rows for assignment to SObject" },
  { lab: "3.3", text: "Deployment mode: FULL + Quick Deploy" },
  { lab: "3.3", text: "nothing to deploy" },
  { lab: "3.3", text: "auth URL" },
  { lab: "3.3", text: "Retry" }
];

export const CSS = MUSICAL_CSS + DEV_CSS;

export function createWorld(ctx) {
  const { t, hud } = ctx;
  // The try after running out of hearts at the Dev starts at him
  const startAt = Number(ctx.params && ctx.params.startAt) || 0;
  const retry = devRetry && Date.now() - devRetry.at < DEV_RETRY_MS ? devRetry : null;
  devRetry = null;
  const verdict = ctx.judgePlan();
  const plan = ctx.plan;
  const pre = (plan && plan.pre) || [];
  const post = (plan && plan.post) || ["backfill", "refdata", "schedule"];
  const manualPre = verdict.deliverability.ok;
  const misplaced = Object.values(verdict).filter((v) => !v.ok).length;
  // How many declared actions fail on this track: the check reads it
  ctx.setData("misplaced", misplaced);

  /* ---------- What is on the track ---------- */

  const look = (id, color, glyph, sign, title, extra) => Object.assign({ id, color, glyph, sign: t(sign), title: t(title), tip: t(title + "_tip") }, extra);
  const LOOKS = {
    auth: look("auth", SLDS.errorDark, "lock", "s_auth", "o_auth"),
    empty: look("empty", SLDS.grey, "empty", "s_empty", "o_empty"),
    tests: look("tests", SLDS.purple, "code", "s_tests", "o_tests", { group: "tests" }),
    fog: look("fog", "#7526E3", "eye", "s_fog", "o_fog", { group: "fog", hidden: true, signEvery: true }),
    drift: look("drift", SLDS.warningDark, "warning", "s_drift", "o_drift"),
    record: look("record", SLDS.error, "error", "s_record", "o_record", { group: "records" }),
    prebackfill: look("prebackfill", SLDS.error, "apex", "s_invalid", "o_prebackfill", { signEvery: true }),
    prerefdata: look("prerefdata", SLDS.error, "box", "s_target", "o_prerefdata", { signEvery: true }),
    preschedule: look("preschedule", SLDS.error, "loop", "s_invalid", "o_preschedule", { signEvery: true }),
    latemanual: look("latemanual", SLDS.warningDark, "warning", "s_late", "o_latemanual", { signEvery: true }),
    lateorder: look("lateorder", SLDS.warningDark, "loop", "s_order", "o_lateorder", { signEvery: true })
  };
  // The bonus pickups on the beat: vegetables, as in world 0
  const COIN = { id: "veg", vegetable: true, color: "#2E844A", glyph: "star" };
  const COMP = { id: "comp", color: SLDS.brand, glyph: "box" };
  const OK = { id: "ok", color: SLDS.success, glyph: "check" };
  const L = createLevel();
  const part = (bar, color, archKey) => {
    L.zone(bar * BAR, color);
    L.arch(bar * BAR + 0.6, t(archKey), { color: "#" + color.toString(16).padStart(6, "0") });
  };

  // Part 1: authentication
  part(0, 0xfe9339, "arch0");
  L.music(0, "intro");
  L.music(2 * BAR, "verse");
  const p1 = { block: LOOKS.auth, coin: COIN };
  ["..--", "----", "x.--", "x.x.", "X.--", "x-.."].forEach((p, i) => L.riff(i, p, p1));
  L.power(5 * BAR + 3, { id: "authurl", model: "permission-set", color: SLDS.navy, glyph: "lock", sign: t("s_authurl") }, true);

  // Part 2: the package, about sixty components for one file
  L.checkpoint(6 * BAR);
  part(6, 0x06a59a, "arch1");
  const p2 = { gap: LOOKS.empty, coin: COMP };
  ["====", "o-o-", "g===", "-o-o", "g.g.", "====", "G-o-", "-.-."].forEach((p, i) => L.riff(6 + i, p, p2));
  L.sign(13 * BAR + 1.5, t("s_delta"), { color: SLDS.navy, glyph: "delta", y: 2.4 });

  // Part 3: the pre-deployment actions
  L.checkpoint(14 * BAR);
  part(14, 0xdd7a01, "arch2");
  const p3 = { block: LOOKS.auth, coin: COIN };
  L.riff(14, "-.-.", p3);
  L.riff(15, "o...", p3);
  L.riff(16, "-...", p3);
  if (manualPre) {
    L.manual(17 * BAR, { header: t("stopHeader"), button: t("stopButton") });
  } else {
    L.riff(16, "..-.", p3);
  }
  L.riff(17, "..-.", p3);
  // The actions declared before the deployment that belong after it: their real errors
  const wrongPre = pre.filter((id) => ["backfill", "refdata", "schedule"].includes(id)).map((id) => LOOKS["pre" + id]);
  [18, 19, 20].forEach((bar, i) => {
    if (wrongPre[i]) {
      L.riff(bar, "-.-.", p3);
      L.block(bar * BAR + 1, wrongPre[i]);
    } else {
      L.riff(bar, "-o-.", p3);
    }
  });
  L.riff(21, "-o-o", p3);

  // Part 4: the Salesforce deployment, Quick Deploy, then the fog of .forceignore
  L.checkpoint(22 * BAR);
  part(22, 0x0176d3, "arch3");
  L.music(22 * BAR, "chorus");
  const p4 = { block: LOOKS.tests, coin: COIN };
  L.riff(22, "-.--", p4);
  L.power(22 * BAR + 1, { id: "quick", model: "rocket", color: SLDS.purple, glyph: "bolt", sign: t("s_quick") });
  for (const bar of [23, 24]) {
    for (const beat of [0, 2]) {
      L.block(bar * BAR + beat, LOOKS.tests, { convert: OK });
    }
  }
  L.riff(23, ".-.-", p4);
  L.riff(24, ".-.-", p4);
  L.riff(25, "----", p4);
  L.checkpoint(26 * BAR);
  L.riff(26, "..--", p4);
  L.power(26 * BAR + 1, { id: "log", model: "record", color: SLDS.navy, glyph: "log", sign: t("s_log") });
  L.fog(26 * BAR + 2, 33 * BAR);
  L.music(27 * BAR, "verse");
  const pf = { block: LOOKS.fog, coin: COIN };
  ["x..-", "-.x.", "x.s.", "-.x.", "x.x.", "-..x"].forEach((p, i) => L.riff(27 + i, p, pf));
  // Victor's note, at the top of the spring's jump, in the fog
  L.note(29 * BAR + 3, 2 * 2.3 + 0.45);
  L.checkpoint(33 * BAR);
  L.music(33 * BAR, "chorus");
  const pd = { block: LOOKS.drift, coin: COIN };
  ["----", "x-x-", "X.o.", "xx..", "-.-."].forEach((p, i) => L.riff(33 + i, p, pd));

  // Part 5: the post-deployment actions, the green lie, then US-062
  L.checkpoint(38 * BAR);
  part(38, 0x2e844a, "arch4");
  const p5 = { block: LOOKS.record, coin: COIN };
  L.riff(38, "--..", p5);
  for (const [bar, beats] of [
    [39, [0, 2]],
    [40, [0, 2]],
    [41, [0, 1]],
    [42, [0]]
  ]) {
    for (const beat of beats) {
      L.block(bar * BAR + beat, LOOKS.record, { convert: OK });
    }
  }
  L.riff(42, "o.-.", p5);
  L.riff(43, "-.-.", p5);
  if (post.includes("refdata") && verdict.refdata.ok) {
    L.sign(43 * BAR, t("s_refdata"), { color: SLDS.success, glyph: "box", y: 2.4 });
  }
  if (post.includes("schedule") && !verdict.schedule.ok) {
    L.block(43 * BAR + 1, LOOKS.lateorder);
  }
  if (!manualPre && !pre.includes("deliverability")) {
    L.block(43 * BAR + 3, LOOKS.latemanual);
  }
  L.checkpoint(44 * BAR);
  ["-o-o", "o=o=", "----", "-.-."].forEach((p, i) => L.riff(44 + i, p, p5));
  const round = (prompt, detail, lesson, right, tips) => ({
    prompt: t(prompt),
    detail: t(detail),
    lesson: t(lesson),
    options: [
      { label: t("optRetry"), ok: right === "retry", tip: t(tips.retry || "") },
      { label: t("optFix"), ok: right === "fix", tip: t(tips.fix || "") },
      { label: t("optDone"), ok: right === "done", tip: t(tips.done || "") },
      { label: t("optRerun"), ok: false, tip: t("tRerun") }
    ]
  });
  L.choice(48 * BAR, {
    header: t("choiceHeader"),
    rounds: [round("r1", "r1d", "l1", "retry", { fix: "t1fix", done: "t1done" }), round("r2", "r2d", "l2", "fix", { retry: "t2retry", done: "t2done" }), round("r3", "r3d", "l3", "done", { retry: "t3retry", fix: "t3fix" })]
  });
  // The Dev "works on my sandbox": his components thrown on the beat, a checkpoint at each round
  L.checkpoint(BOSS_BAR * BAR);
  L.music(BOSS_BAR * BAR, "dev");
  const devLooks = DEV_PARTS.map((key) => ({ id: "dev-" + key, color: "#DD7A01", glyph: "box", sign: t("d_" + key), title: t("d_title", { name: t("d_" + key) }), tip: t("d_tip"), group: "dev", signEvery: true, burst: 0xfe9339 }));
  // A Pull Request is on the ground, a little up: taken by running into it, missed only from the top of a jump
  const rounds = bossRounds(L, {
    bar: BOSS_BAR,
    roundBars: ROUND_BARS,
    rounds: ROUNDS,
    look: (n) => devLooks[n % devLooks.length],
    power: () => ({ id: "pipeline", model: "pull-request", color: SLDS.success, glyph: "branch", sign: t("s_pipeline"), y: 0.85, size: 1.3 })
  });
  // Then the last lap, the integration org in sight
  const lastBar = rounds.end / BAR;
  L.music(rounds.end, "chorus");
  const pe = { gap: LOOKS.empty, coin: OK };
  L.riff(48, "..-.", pe);
  ["o-o-", "G-o-", "o=o=", "G.G.", "----"].forEach((p, i) => L.riff(lastBar + i, p, pe));
  // The song speeds up part by part, on bar lines: +28 % for the last lap
  [
    [6, 1.06],
    [14, 1.12],
    [22, 1.18],
    [38, 1.24],
    [49, 1.28]
  ].forEach(([bar, pace]) => L.tempo(bar * BAR, pace));
  L.end((lastBar + 5) * BAR, { text: t("endSign"), glyph: "cloud", color: SLDS.brand });

  /* ---------- The story on the way ---------- */

  let meter = null;
  const say = (at, run) => L.script(at, run);
  // What is only told, never state: skipped when the run starts past it (guinea-at, a try again at the Dev)
  const story = (at, run) => L.script(at, (api) => api.beat < at + 2 && run(api));
  say(0, () => {
    hud.setPath([t("path0"), t("path1"), t("path2"), t("path3"), t("path4")], 0);
    hud.goal(t("goal0"));
  });
  story(0, () => hud.tick("Login to the integration org: auth URL"));
  story(7 * BAR - 1, (api) => api.coach(t("coachArc"), 2400));
  say(6 * BAR, () => {
    hud.setPath([t("path0"), t("path1"), t("path2"), t("path3"), t("path4")], 1);
    hud.goal(t("goal1"));
    meter = document.createElement("div");
    meter.className = "gr-mu-meter";
    hud.extra.appendChild(meter);
    updateMeter();
  });
  story(13 * BAR, (api) => {
    hud.tick("Components: 61 deployed");
    api.coach(t("coachPackage"), 3200, true);
  });
  say(14 * BAR, () => {
    hud.setPath([t("path0"), t("path1"), t("path2"), t("path3"), t("path4")], 2);
    hud.goal(t(manualPre ? "goal2manual" : "goal2"));
  });
  story(14 * BAR, () => {
    hud.tick("Listing Pre-deployment actions");
    if (manualPre) {
      hud.tick("Set Email Deliverability to All Email");
    }
  });
  say(22 * BAR, () => {
    hud.setPath([t("path0"), t("path1"), t("path2"), t("path3"), t("path4")], 3);
    hud.goal(t("goal3"));
  });
  story(22 * BAR, () => hud.tick("Deploying metadata..."));
  say(25 * BAR, () => hud.goal(t("goal3fog")));
  story(25 * BAR, (api) => {
    hud.chat("romain", t("romainFog"), 6000);
    hud.tick(t("fogTick"));
    api.coach(t("coachLog"), 2800, true);
  });
  say(33 * BAR, () => hud.goal(t("goal3")));
  story(33 * BAR, (api) => api.coach(t("coachFogOut"), 3200, true));
  say(38 * BAR, () => {
    hud.setPath([t("path0"), t("path1"), t("path2"), t("path3"), t("path4")], 4);
    hud.goal(t("goal4"));
  });
  story(38 * BAR, (api) => {
    hud.toast(t("greenLie"), "good");
    hud.tick("Listing Post-deployment actions");
    ctx.sound.play("fanfare");
    ctx.fx.burst(api.x(api.beat) + 4, 3, 0, { count: 60, speed: 5, up: 6, life: 1.4 });
  });
  const backfilled = verdict.backfill.ok && post.includes("backfill");
  say(38 * BAR + 2, (api) => {
    if (backfilled) {
      api.convert("records");
    }
    ctx.setData("boss", backfilled ? "backfilled" : "records");
  });
  story(38 * BAR + 2, (api) => {
    hud.toast(t("greenLieTwist"), "bad");
    api.coach(t("coachGreen"), 2400, true);
    if (backfilled) {
      hud.tick(t("backfillRuns"));
      ctx.sound.play("power");
    } else {
      hud.chat("mariia", t("backfillMissing"), 5000);
    }
  });
  say(46 * BAR, () => hud.goal(t("goal5")));
  story(46 * BAR, () => {
    hud.tick(t("failTick"));
    hud.chat("mariia", t("mariiaFail"), 6500);
  });
  say(BOSS_BAR * BAR, () => {
    hud.goal(t("goalDev"));
    hud.tick(t("devTick"));
  });
  say(rounds.end, () => hud.goal(t("goal6")));

  function updateMeter() {
    if (meter) {
      meter.textContent = t("meter", { n: run.coinsOf("comp").got });
    }
  }

  let finished = false;
  // The run plays with a context of its own: a retry starts at the Dev, and the
  // last heart lost there says so on the result card
  const runCtx = Object.create(ctx, {
    params: { value: { startAt: retry ? BOSS_BAR * BAR : startAt } },
    loseAttempt: { value: loseAttempt }
  });
  const run = createMusicalRun(runCtx, {
    song: SONG,
    level: L,
    palette: [0x06a59a, 0x9050e9, 0x2e844a, 0xfe9339, 0x1b96ff, 0xe3066a],
    scenery: SCENERY,
    // The package is its components, in turn; what the backfill and Quick Deploy free passes
    coinModels: { comp: ["custom-field", "apex", "flow", "permission-set", "lwc"], ok: "check-pass" },
    // A gap is a failed check to fall in; a checkpoint is a check that passed
    pitModel: "check-fail",
    checkpointModel: "check-pass",
    // The integration org: the org the deployment reaches, and the Cloudity logo on the finish line
    finish: [{ name: "org-cloud", height: 3 }],
    finishLine: { name: "cloudity-logo", height: 1.3 },
    // The Dev's components leave his hands
    thrower: (v) => devBody.hand(v),
    callbacks: {
      onThrow() {
        devThrows();
      },
      onHit() {
        // Back to the checkpoint: the Pull Requests of the round come back, the blaster stops
        blaster.setBack();
      },
      onCoin(coin) {
        if (coin.id === "comp") {
          updateMeter();
        }
      },
      onPower(power) {
        if (power.id === "pipeline") {
          takePipeline(power);
        } else if (power.id === "authurl") {
          hud.toast(t("p_auth"), "power");
        } else if (power.id === "quick") {
          hud.toast(t("p_quick"), "power");
          hud.tick("Deployment mode: FULL + Quick Deploy");
          run.convert("tests");
          run.coach(t("coachQuick"), 2600, true);
        } else if (power.id === "log") {
          hud.toast(t("p_log"), "power");
          run.reveal("fog");
        }
      },
      onManual(stop, onTheWay) {
        ctx.collect(onTheWay ? 200 : 120, t("stopDone"));
        if (onTheWay) {
          hud.tick(t("stopOnTheWay"));
        }
      },
      onEnd() {
        finished = true;
        hud.goal("");
        hud.toast(t("arrived"), "good");
        run.finale();
        const info = missedInfo();
        ctx.setData("missed", info ? "yes" : "no");
        ctx.finish(bonus(), info);
      }
    }
  });

  /* ---------- The Dev "works on my sandbox" ---------- */

  const { THREE, camera, engine, sound, paint } = ctx;
  const devFace = pickAdmins(6, ctx.random)[0];
  const devFaceUrl = adminFaceUrl(devFace);
  const dev = { state: "away", hp: DEV_HP, walk: 0, hit: 0, throwing: 0, down: 0, downX: 0, sinkAt: 0, loops: 0, thrown: 0, shots: 0, coached: false };
  let clock = 0;
  const shown = {};
  let autoplay = false;
  const devBody = createDevFigure(ctx, { faceUrl: devFaceUrl, name: t("devName"), screen: "deploy start", onFace: () => ctx.setData("devface", String(devFace)) });
  // He stands in his sandbox: it works there
  const wood = paint.plain(0xb07a45, { roughness: 0.8 });
  const sand = new THREE.Mesh(paint.geometry("w6-sand", () => new THREE.BoxGeometry(2.6, 0.24, 2)), paint.plain(0xf2d49b, { roughness: 0.95 }));
  sand.position.y = 0.12;
  devBody.group.add(sand);
  for (const [w, d, x, z] of [
    [2.9, 0.16, 0, 1.08],
    [2.9, 0.16, 0, -1.08],
    [0.16, 2.3, 1.37, 0],
    [0.16, 2.3, -1.37, 0]
  ]) {
    const plank = new THREE.Mesh(paint.geometry("w6-plank-" + w, () => new THREE.BoxGeometry(w, 0.36, d)), wood);
    plank.position.set(x, 0.18, z);
    devBody.group.add(plank);
  }
  const devBar = createDevBar(hud, devFaceUrl, t("devName"));
  const speech = createDevSpeech(hud, () => clock);
  // The Pull Requests make the pipeline fire the components of US-014 at his head (musical.js)
  const blaster = createBossBlaster(ctx, run, {
    id: "pipeline",
    powers: rounds.powers,
    models: PIPE_SHOTS,
    colors: PIPE_COLORS,
    beats: BLASTER_BEATS,
    perBeat: SHOTS_PER_BEAT,
    flight: SHOT_BEATS,
    aim: (out) => out.copy(devBody.face.position),
    onHit: (shot, at) => hitDev(shot, at),
    onFire: () => {
      dev.shots += 1;
      sound.play("throw");
    }
  });

  // The check plays the Dev by itself, on the exact beats (window.__guineaRun only exists for checks)
  if (window.__guineaRun) {
    window.__guineaRun.w6 = {
      autoplay(on) {
        autoplay = on !== false;
      }
    };
  }

  /** The last heart lost at the Dev: the result card says the next try starts there. */
  function loseAttempt(title, tip) {
    const atDev = dev.state === "fight";
    const last = atDev && ctx.attempts <= 1;
    const left = ctx.loseAttempt(title, last ? (tip ? tip + " " : "") + t("retryHint") : tip);
    if (!ctx.playing && atDev) {
      const s = wayStats();
      devRetry = { at: Date.now(), log: logTaken(), quick: quickTaken(), got: s.got, coins: s.coins, vegetables: s.vegetables, vegTotal: s.vegTotal };
      speech.hide();
    }
    return left;
  }

  function updateDev(dt, time) {
    clock += dt;
    if (dev.state === "away") {
      if (run.beat < BOSS_BAR * BAR - 2) {
        return;
      }
      enterDev();
    }
    // The last round again, while he still deploys
    if (dev.state === "fight" && run.mode === "run" && run.beat >= rounds.end) {
      blaster.setBack();
      if (run.again()) {
        dev.loops += 1;
        run.coach(t("coachDevAgain"), 2600, true);
        speech.say(t("sayAgain"), true);
      }
    }
    const next = blaster.update(time, dev.state === "fight");
    if (next && !dev.coached && next.x - camera.position.x < 14 && next.beat - run.beat < 3) {
      dev.coached = true;
      run.coach(t("coachPipeline"), 2000, true);
    }
    speech.update();
    placeDev(dt, time);
    // On a phone the track ahead is beside his head: the bubble goes over it
    speech.place(camera, devBody.face.position, DEV_HEAD_R * devBody.face.scale.x, engine.portrait);
    writeDevData();
  }

  function enterDev() {
    ctx.bossStarted();
    dev.state = "fight";
    // The components of the package are long deployed: their counter makes room for him
    if (meter) {
      meter.remove();
    }
    dev.walk = 0;
    devBody.visible = true;
    devBar.hidden = false;
    devBar.render(1);
    sound.play("bossIn");
    speech.say(t("sayIn"));
  }

  function devThrows() {
    dev.throwing = 1;
    dev.thrown += 1;
    sound.play("w6Deploy");
  }

  function takePipeline(power) {
    blaster.take(power.n, dev.state === "fight");
    if (dev.state !== "fight") {
      ctx.points(20);
      return;
    }
    hud.toast(t("p_pipeline"), "power");
  }

  function hitDev(shot, at) {
    if (dev.state !== "fight") {
      return;
    }
    dev.hp = Math.max(0, dev.hp - 1);
    dev.hit = 1;
    ctx.points(5);
    sound.play("bossHit");
    ctx.fx.burst(at.x, at.y, at.z, { count: 7, colors: [shot.color, 0xffffff], speed: 3, up: 2.5, life: 0.5 });
    devBar.render(dev.hp / DEV_HP);
    if (dev.hp === DEV_HP - 14 || dev.hp === DEV_HP / 2) {
      speech.say(t("sayHit"), true);
    }
    if (dev.hp <= 0) {
      beatDev();
    }
  }

  function beatDev() {
    ctx.bossBeaten();
    dev.state = "down";
    dev.down = 0;
    devRetry = null;
    blaster.stop();
    // His components still ahead pop, the band goes back to the chorus
    run.convert("dev");
    run.music.setSection("chorus", run.music.bar + 1);
    sound.play("bossDown");
    ctx.collect(300, t("devBeaten"));
    hud.goal("");
    devBar.hidden = true;
    // He stays where he is once his last line is read, and the guinea pig runs past him
    speech.say(t("sayDown"), false, (read) => {
      dev.sinkAt = dev.down + read;
    });
    ctx.fx.burst(devBody.face.position.x, devBody.face.position.y, devBody.face.position.z, { count: 50, colors: [0xffffff, 0xdd7a01, 0xf2d49b, 0x2e844a], speed: 5, up: 5, life: 1.4 });
  }

  /** He walks in from ahead, stands right of the guinea pig and moves with the camera, until he is beaten. */
  function placeDev(dt, time) {
    if (!devBody.visible) {
      return;
    }
    const P = engine.portrait ? DEV_PHONE : DEV_DESK;
    const spb = run.music.secondsPerBeat;
    const pulse = engine.motion ? run.music.pulse : 0;
    dev.walk = Math.min(1, dev.walk + dt / (spb * 3));
    dev.hit = Math.max(0, dev.hit - dt * 5);
    dev.throwing = Math.max(0, dev.throwing - dt / (spb * 0.8));
    let x = camera.position.x + P.dx + Math.pow(1 - dev.walk, 2) * 9;
    let lean = 0;
    if (dev.state === "down") {
      dev.down += dt;
      lean = Math.min(1, dev.down / 0.6) * 0.3;
      if (dev.sinkAt && dev.down > dev.sinkAt) {
        x = dev.downX;
      } else {
        dev.downX = x;
      }
      if (x < camera.position.x - 16) {
        devBody.visible = false;
        speech.hide();
        dev.state = "gone";
        return;
      }
    }
    const stride = dev.walk < 1 ? Math.sin(time * 10) : 0;
    const typing = dev.throwing > 0 ? Math.sin(time * 30) * 0.2 : Math.sin(time * 6) * 0.04;
    devBody.place({ x, y: pulse * 0.06, z: P.z, scale: P.scale * (1 + dev.hit * 0.08), lean, stride, typing });
  }

  function writeDevData() {
    const values = { dev: dev.state, devhp: dev.hp, thrown: dev.thrown, shots: dev.shots, loops: dev.loops };
    for (const [name, value] of Object.entries(values)) {
      if (shown[name] !== value) {
        shown[name] = value;
        ctx.setData(name, value);
      }
    }
  }

  // A try that started at the Dev counts what the try before it did on the way there
  function logTaken() {
    return retry ? retry.log : run.powerTaken("log");
  }

  function quickTaken() {
    return retry ? retry.quick : run.powerTaken("quick");
  }

  function wayStats() {
    const s = run.stats;
    return retry ? Object.assign({}, s, { got: retry.got, coins: retry.coins, vegetables: retry.vegetables, vegTotal: retry.vegTotal }) : s;
  }

  function bonus() {
    const s = wayStats();
    let points = 150 + Math.round((200 * s.got) / Math.max(1, s.coins));
    points -= misplaced * 30;
    if (!logTaken()) {
      points -= 40;
    }
    if (!quickTaken()) {
      points -= 40;
    }
    return Math.max(0, points);
  }

  function missedInfo() {
    const lines = [];
    const s = wayStats();
    // What the plan of World 3 got wrong comes first: it is what this world is about
    if (!(verdict.backfill.ok && post.includes("backfill"))) {
      lines.push(t("info_backfill"));
    } else if (misplaced > 0) {
      lines.push(t("info_misplaced", { n: misplaced }));
    }
    if (!logTaken()) {
      lines.push(t("info_log"));
    }
    return endMissedInfo(lines, { powerTaken: (id) => (id === "quick" ? quickTaken() : run.powerTaken(id)) }, s, t);
  }

  const world = musicalWorld(
    run,
    () => finished,
    () => {
      if (meter) {
        meter.remove();
      }
      devBar.remove();
      speech.remove();
      devBody.dispose();
      blaster.dispose();
      if (window.__guineaRun && window.__guineaRun.w6) {
        delete window.__guineaRun.w6;
      }
    }
  );
  const runStart = world.start;
  const runUpdate = world.update;
  world.start = () => {
    runStart();
    if (retry) {
      hud.toast(t("retryBoss"), "power");
    }
  };
  world.update = (dt, time) => {
    if (autoplay) {
      run.autoJump();
    }
    runUpdate(dt, time);
    if (!finished && ctx.playing) {
      updateDev(dt, time);
    }
  };
  return world;
}
