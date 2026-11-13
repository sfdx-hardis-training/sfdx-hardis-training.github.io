/*
 * World 8, Release to the production org: a musical run, the last stop of the pipeline before world 9 guards it.
 * The guinea pig runs to the music and the player only jumps.
 *
 * The run follows the steps of a release: the three checks worth checking,
 * the rehearsal in the preprod org, the production Pull Request and its check
 * read like it matters, the merge and the deployment watched to its end, then
 * the verification in the production org.
 *
 * The rehearsal is musical: preprod plays the same riff as production, eight
 * bars of it, and there a mistake costs nothing (a release that fails in
 * preprod has cost you nothing). In production the same riff comes back with
 * the full band, with one thing more that preprod did not have: drift.
 *
 * Then the boss: the Data Cloud wakes up, a giant rabbit that never heard of
 * the new field. It throws its errors on the beat, so jumping in time dodges
 * them, and golden carrots on the track make the guinea pig fire vegetables
 * back at it until it has no life left. Its last round comes again until it
 * is down, and a player out of hearts there starts the next try at it.
 *
 * The finale is a DORA card after a first release, and two questions about
 * what its numbers really say.
 */
import { createLevel, createMusicalRun, MUSICAL_TEXTS, MUSICAL_CSS, endMissedInfo, musicalWorld, bossRounds, createBossBlaster } from "./musical.js";
import { melody } from "../core/music.js";
import { SLDS } from "../core/painter.js";
import { readingMs } from "../hud.js";

export const PADS = ["jump"];
// The mode is the tempo of the song (musical.js): the shell leaves the time as it is
export const OWN_SPEED = true;
// The salesforce items (components, checks, runners, orgs, the rocket, the Cloudity logo and the
// badge), the Kenney springs, trees and bushes far behind, the bonus vegetables, and the boss
export const MODELS = ["salesforce", "platform", "nature", "vegetables", "data-cloud"];

const SCENERY = [
  { names: ["tree_default", "tree_oak", "tree_pineRoundA"], z: -4.6, depth: 1.6, every: 5.2, height: 3.2, bounce: 0.05 },
  // The CI runners of the pipeline, along the track, and the orgs in the sky
  { names: ["ci-runner"], z: -6.9, every: 9, height: 2.3, bounce: 0.04, turn: 0.4 },
  { names: ["org-cloud"], y: 7.5, rise: 2.5, z: -15, every: 19, height: 2.6, bounce: 0.02, turn: 0.3 }
];

const SONG = {
  bpm: 116,
  // G major: I vi IV V, a sunny evening release
  root: 67,
  progression: [0, 5, 3, 4],
  lead: {
    chorus: melody("7.4.2.4.7.9.7.4. 5.7.9.7.5...2.4. 3.5.7.5.3.5.7.8. 8.6.4.6.8...6.4."),
    // The Data Cloud's theme: the same chords, a lead that stomps
    boss: melody("7...7.6.7...9... 5...5.4.5...7... 3...3.2.3...5... 4...6.7.9...8.7.")
  },
  sections: {
    // The boss: the whole band, heavier, a snare on the backbeat and a bass on every eighth
    boss: {
      kick: "X...x.x.X...x.x.",
      snare: "....X.......X..x",
      hat: "xxxxxxxxxxxxxxxx",
      open: "..x...x...x...x.",
      bass: "x.xox.xox.xox.xo",
      stab: "x..x..x...x..x..",
      arp: true,
      lead: "boss"
    }
  },
  start: "intro",
  end: "lounge"
};

const BAR = 4;
// The riff rehearsed in preprod, and played again in production
const RIFF = ["x.x.", "X-x-", "g.o.", "xx..", "x.g.", "o-X-", "x..x", "G-x-"];

/* ---------- The boss: the Data Cloud ---------- */

// After the verification: a bar for the rabbit to rise, then three rounds of four bars
const BOSS_BAR = 41;
const ROUND_BARS = 4;
// A round per line, a bar per string, a beat per character: x an error thrown on
// the beat, c a golden carrot on the ground. A round after a checkpoint starts
// with three free beats, so nothing lands on a guinea pig that just came back
const ROUNDS = [
  ["x.x.", "x.c.", "..x.", "x.x."],
  ["...x", "..c.", "x.xx", "..x."],
  ["...x", "..c.", "x.x.", "xx.x"]
];
const ROUNDS_END = (BOSS_BAR + 1 + ROUNDS.length * ROUND_BARS) * BAR;
// The last round comes again until the boss is down, then two bars to the finish
const END_BAR = BOSS_BAR + 1 + ROUNDS.length * ROUND_BARS + 2;
// Three carrots of sixteen vegetables: two are not enough, three are
const BOSS_HP = 40;
const BLASTER_BEATS = 8;
const SHOTS_PER_BEAT = 2;
const SHOT_BEATS = 0.75;
// The errors it throws, in turn: a short label and why it happens
const ERRORS = ["stream", "mapping", "kit", "identity", "segment", "dmo", "space", "activation"];
const DC = { navy: "#1F1646", lavender: "#7473B5", block: "#3B2D7D", edge: "#5A4FCF" };
// Where the rabbit floats, from the camera: right of the guinea pig, behind the track, over it
const BOSS_DESK = { dx: 5.6, y: 2.5, z: -3.4, height: 5.6 };
const BOSS_PHONE = { dx: 1.55, y: 3.3, z: -3.4, height: 5.8 };
const VEG_SHOTS = ["carrot", "fennel", "bell-pepper", "cucumber", "romaine", "parsley"];
const VEG_COLORS = [0xff8a3d, 0x7bc96f, 0xe8473b, 0x3e9b4f, 0x8cd17d, 0x2e844a];
// A player out of hearts at the boss starts the next try at it, within this long.
// Kept by the module, which outlives a world (the shell builds a new one for each try)
const BOSS_RETRY_MS = 15 * 60000;
let bossRetry = null;

export const TEXTS = {
  en: Object.assign({}, MUSICAL_TEXTS.en, {
    intro: "UAT signed off. The release goes to the production org this evening: rehearse the song in the preprod org, then play it for real.",
    how1: "Jump with Up, Space or a tap when the ring closes",
    how2: "In the preprod org a mistake costs nothing: learn the riff there",
    how3: "In production, stop on what you did not expect",
    note: "The rating is about the period, not about you. I wish someone had told me that on my first release. - V.",
    path0: "Checks",
    path1: "preprod",
    path2: "main",
    path3: "Deploy",
    path4: "Verify",
    arch0: "1 · Three checks",
    arch1: "2 · preprod org",
    arch2: "3 · main branch",
    arch3: "4 · Merge, and stay",
    arch4: "5 · Verify",
    goal0: "Jump for the three checks worth checking",
    goal1: "Rehearse in the preprod org: learn the riff, mistakes are free",
    goal1manual: "The first check stops red, on purpose: press Mark as done",
    goal2: "The Pull Request to the main branch: read the check like it matters",
    goal3: "The same riff, for real. Watch for drift",
    goal4: "Verify in the production org: the new story, and an old one",
    coachRehearse: "The preprod org: the same riff as production, for free",
    coachProd: "Same riff as the preprod org, with one surprise",
    coachQuick: "Quick Deploy: the tests already ran during the validation",
    coachVerify: "The most common incident is an old feature breaking",
    s_check1: "UAT signed off",
    s_check2: "Manual steps",
    s_check3: "Look at prod",
    s_jwt: "sf org login jwt",
    s_jwt2: "production org",
    s_quick: "Quick Deploy",
    s_v1: "Customer Tier",
    s_v2: "Contacts",
    s_v3: "Record saves",
    s_green: "Signed off?",
    s_fail: "Fails here",
    s_prod: "Error",
    s_drift: "Drift",
    s_half: "Half done",
    s_old: "Old feature",
    s_late: "Too late",
    s_dora: "DORA metrics",
    p_check1: "UAT signed off: somebody tested it and said yes",
    p_check2: "The manual steps of the release, known before you create anything",
    p_check3: "Look at the production org first: know what is already there before you deploy",
    p_jwt: "sf org login jwt: the certificate key of the preprod org works",
    p_jwt2: "sf org login jwt: the first JWT login into the production org",
    p_quick: "Quick Deploy. Apex tests: Already run during the validation",
    p_v1: "Acme Corp shows Customer Tier: Gold. The new story works",
    p_v2: "The contacts of Acme Corp still show: an older feature still works",
    p_v3: "A record saves: the old features still work",
    o_green: "Green is not signed off",
    o_green_tip: "Is UAT genuinely signed off? Not \"the deployment was green\": somebody tested it and said yes.",
    o_fail: "Failed in the preprod org",
    o_fail_tip: "That is what the preprod org is for: a release that fails here has cost you nothing.",
    o_prod: "Failed in production",
    o_prod_tip: "Rehearse in the preprod org: a release that deploys there cleanly has very little left to surprise you with.",
    o_drift: "Fails in production, worked in the preprod org",
    o_drift_tip: "The production org drifted: an extra validation rule, a record type, real data. Keep the preprod org as close to production as you can.",
    o_half: "The deployment half-succeeded",
    o_half_tip: "Deployments are atomic: a post-deployment action failed. Re-run the action, do not re-run the deployment.",
    o_old: "An old feature broke",
    o_old_tip: "Check something that already worked still works: open an account, its contacts, save a record.",
    o_tests: "Apex tests ran again",
    o_tests_tip: "The validation already ran the tests: the merge job applies it, as a Quick Deploy.",
    o_latemain: "The manual step was never done",
    o_latemain_tip: "A manual action runs once in every org, production included: declare it in World 3, then mark it as done in each org.",
    stopHeader: "1 to do by hand",
    stopButton: "Mark as done",
    stopDone1: "Mark as done in preprod, then Re-run all jobs: green",
    stopDone2: "Done in the production org: the last org that needed the click",
    choiceHeader: "Read the check",
    q0: "The Metadata row of the comment says: 1 deleted",
    q0d: "You did not expect anything to go.",
    q0a: "Read destructiveChanges.xml",
    q0b: "Merge anyway",
    q0c: "Re-run all jobs",
    q0Ok: "Stopping on an unexpected deletion is the job",
    q0bTip: "A deletion in production is permanent and takes data with it. Stop, and find out what goes and who intended it.",
    q0cTip: "A re-run shows the same figure. The comment will not tell you what goes: destructiveChanges.xml and the diff will.",
    mainGreen: "Process Deployment (sfdx-hardis) on the main branch: green",
    doraTitle: "DORA metrics",
    doraPeriod: "main, Last 90 days",
    q1: "Your manager asks for your lead time. You quote:",
    q1a: "5.7 d: the Lead time (median), per User Story",
    q1b: "0.1 d: the Pull Requests of this branch alone",
    q1c: "No data",
    q1bTip: "Flattering and wrong: the User Stories waited days before that last Pull Request. Quote the per-story lead time, 5.7 d.",
    q1cTip: "No data is the honest answer for Recovery, when nothing failed. The lead time has data: 5.7 d.",
    q1Ok: "Days, not weeks: long means work is sitting somewhere.",
    q2: "One deployment so far, 0 % failure rate. One red job next week, and the failure rate reads:",
    q2a: "50 %",
    q2b: "10 %",
    q2c: "Still 0 %, a red job is not a failure",
    q2bTip: "With one deployment, small numbers move in big steps: one red job out of two is 50 %.",
    q2cTip: "A red deployment job is exactly what the failure rate counts.",
    q2Ok: "Small numbers move in big steps. The rating is about the period, not about you.",
    choose: "Up and down choose, Enter answers. Or tap.",
    shipped: "You have shipped once, and the DORA metrics say exactly that.",
    info_checks: "You skipped {{n}} of the three checks of step 1: know the manual steps and look at production before you create anything.",
    info_verify: "You verified {{n}} of 3 things in the production org: the most common incident after a release is an old feature breaking.",
    info_quick: "You missed Quick Deploy: the validation already ran the tests.",
    info_coins: "You ate {{got}} of {{total}} vegetables.",
    arch5: "6 · Data Cloud",
    goal5: "Jump the errors on the beat. Grab a golden carrot",
    goal5down: "The Data Cloud is down: on to the finish",
    coachCarrot: "A golden carrot: run into it!",
    coachBlaster: "Veggie blaster: the guinea pig fires on its own!",
    coachAgain: "The Data Cloud holds on: one more round",
    coachDown: "The Data Cloud has no more life!",
    s_carrot: "Veggie blaster",
    p_carrot: "Veggie blaster! Vegetables fly at the Data Cloud",
    bossName: "Data Cloud",
    sayIn: "A new field on Account? Nobody told me!",
    sayHit: "Ouch! Not the carrots!",
    sayAgain: "Still standing! Again!",
    sayDown: "OK, OK... next time, put me in a data kit.",
    bossBeaten: "Data Cloud is down",
    retryBoss: "Straight back to the Data Cloud: the release is done",
    retryHint: "Try again starts at the Data Cloud.",
    e_stream: "Data stream failed",
    e_stream_tip: "A data stream reads its source through a connection of the org it runs in: set the connection up in each org, then run the stream again.",
    e_mapping: "Field not mapped",
    e_mapping_tip: "A new field reaches Data Cloud only once it is added to the data stream and mapped to the data model.",
    e_kit: "Data kit not deployed",
    e_kit_tip: "Installing the package is not the end: deploy the data kit in the target org to create what it holds.",
    e_identity: "Identity resolution not ready",
    e_identity_tip: "Unified profiles exist only once the identity resolution ruleset has run: the segments built on them wait for it.",
    e_segment: "Segment not refreshed",
    e_segment_tip: "A segment shows the members of its last refresh: refresh it once the data is in.",
    e_dmo: "DMO not found",
    e_dmo_tip: "A mapping to a custom data model object needs that object in the target org first: deploy the data model before the mappings.",
    e_space: "Data space missing",
    e_space_tip: "Data Cloud metadata belongs to a data space: the target org needs the same data space.",
    e_activation: "Activation failed",
    e_activation_tip: "An activation sends a segment to a target: that activation target must exist in each org."
  }),
  fr: Object.assign({}, MUSICAL_TEXTS.fr, {
    intro: "La recette UAT est validée. La release part dans l'org de production ce soir : répétez le morceau dans l'org preprod, puis jouez-le pour de vrai.",
    how1: "Sautez avec Haut, Espace ou en touchant quand l'anneau se referme",
    how2: "Dans l'org preprod, une erreur ne coûte rien : apprenez le riff là",
    how3: "En production, arrêtez-vous sur ce que vous n'attendiez pas",
    note: "La note porte sur la période, pas sur vous. J'aurais aimé qu'on me le dise à ma première release. - V.",
    path0: "Contrôles",
    path1: "preprod",
    path2: "main",
    path3: "Déploiement",
    path4: "Vérifier",
    arch0: "1 · Trois contrôles",
    arch1: "2 · org preprod",
    arch2: "3 · branch main",
    arch3: "4 · Merger, et rester",
    arch4: "5 · Vérifier",
    goal0: "Sautez pour les trois contrôles qui valent la peine",
    goal1: "Répétez dans l'org preprod : apprenez le riff, les erreurs sont gratuites",
    goal1manual: "Le premier contrôle s'arrête en rouge, exprès : appuyez sur Mark as done",
    goal2: "La Pull Request vers la branch main : lisez le contrôle comme si ça comptait",
    goal3: "Le même riff, pour de vrai. Attention à la dérive",
    goal4: "Vérifiez dans l'org de production : la nouvelle story, et une ancienne",
    coachRehearse: "L'org preprod : le même riff qu'en production, gratuitement",
    coachProd: "Le même riff que dans l'org preprod, avec une surprise",
    coachQuick: "Quick Deploy : les tests ont déjà tourné pendant la validation",
    coachVerify: "L'incident le plus courant, c'est une ancienne fonctionnalité qui casse",
    s_check1: "UAT validée",
    s_check2: "Étapes manuelles",
    s_check3: "Regarder la prod",
    s_jwt: "sf org login jwt",
    s_jwt2: "org de production",
    s_quick: "Quick Deploy",
    s_v1: "Customer Tier",
    s_v2: "Contacts",
    s_v3: "Enregistrement OK",
    s_green: "Validée ?",
    s_fail: "Échoue ici",
    s_prod: "Erreur",
    s_drift: "Dérive",
    s_half: "À moitié",
    s_old: "Ancienne fonction",
    s_late: "Trop tard",
    s_dora: "Métriques DORA",
    p_check1: "UAT validée : quelqu'un a testé et a dit oui",
    p_check2: "Les étapes manuelles de la release, connues avant de créer quoi que ce soit",
    p_check3: "Regardez d'abord l'org de production : sachez ce qui s'y trouve déjà avant de déployer",
    p_jwt: "sf org login jwt : la clé du certificat de l'org preprod marche",
    p_jwt2: "sf org login jwt : la première connexion JWT à l'org de production",
    p_quick: "Quick Deploy. Apex tests: Already run during the validation",
    p_v1: "Acme Corp affiche Customer Tier: Gold. La nouvelle story marche",
    p_v2: "Les contacts d'Acme Corp s'affichent toujours : une fonctionnalité plus ancienne marche encore",
    p_v3: "Un enregistrement se sauve : les anciennes fonctionnalités marchent toujours",
    o_green: "Vert n'est pas validé",
    o_green_tip: "La recette UAT est-elle vraiment validée ? Pas \"le déploiement était vert\" : quelqu'un a testé et a dit oui.",
    o_fail: "Échec dans l'org preprod",
    o_fail_tip: "C'est à ça que sert l'org preprod : une release qui échoue ici ne vous a rien coûté.",
    o_prod: "Échec en production",
    o_prod_tip: "Répétez dans l'org preprod : une release qui s'y déploie proprement n'a presque plus de surprise en réserve.",
    o_drift: "Échoue en production, marchait dans l'org preprod",
    o_drift_tip: "L'org de production a dérivé : une règle de validation en plus, un type d'enregistrement, de vraies données. Gardez l'org preprod aussi proche de la production que possible.",
    o_half: "Le déploiement a réussi à moitié",
    o_half_tip: "Les déploiements sont atomiques : une action post-deployment a échoué. Relancez l'action, pas le déploiement.",
    o_old: "Une ancienne fonctionnalité a cassé",
    o_old_tip: "Vérifiez que ce qui marchait marche encore : ouvrez un compte, ses contacts, enregistrez un enregistrement.",
    o_tests: "Les tests Apex ont tourné à nouveau",
    o_tests_tip: "La validation a déjà exécuté les tests : le job du merge l'applique, en Quick Deploy.",
    o_latemain: "L'étape manuelle n'a jamais été faite",
    o_latemain_tip: "Une action manuelle s'exécute une fois dans chaque org, production comprise : déclarez-la dans le Monde 3, puis marquez-la comme faite dans chaque org.",
    stopHeader: "1 to do by hand",
    stopButton: "Mark as done",
    stopDone1: "Mark as done in preprod, puis Re-run all jobs : vert",
    stopDone2: "Fait dans l'org de production : la dernière org qui avait besoin du clic",
    choiceHeader: "Lisez le contrôle",
    q0: "La ligne Metadata du commentaire dit : 1 deleted",
    q0d: "Vous ne vous attendiez à aucune suppression.",
    q0a: "Lire destructiveChanges.xml",
    q0b: "Merger quand même",
    q0c: "Re-run all jobs",
    q0Ok: "S'arrêter sur une suppression inattendue, c'est le métier",
    q0bTip: "Une suppression en production est définitive et emporte des données avec elle. Arrêtez-vous, et cherchez ce qui part et qui l'a voulu.",
    q0cTip: "Relancer affiche le même chiffre. Le commentaire ne dit pas ce qui part : destructiveChanges.xml et le diff, si.",
    mainGreen: "Process Deployment (sfdx-hardis) sur la branch main : vert",
    doraTitle: "Métriques DORA",
    doraPeriod: "main, Last 90 days",
    q1: "Votre manager demande votre lead time. Vous annoncez :",
    q1a: "5.7 d : le Lead time (median), par User Story",
    q1b: "0.1 d : les Pull Requests de cette branch seule",
    q1c: "No data",
    q1bTip: "Flatteur et faux : les User Stories ont attendu des jours avant cette dernière Pull Request. Annoncez le lead time par story, 5.7 d.",
    q1cTip: "No data est la réponse honnête pour Recovery, quand rien n'a échoué. Le lead time a des données : 5.7 d.",
    q1Ok: "Des jours, pas des semaines : long veut dire que du travail attend quelque part.",
    q2: "Un seul déploiement jusqu'ici, 0 % de failure rate. Un job rouge la semaine prochaine, et le failure rate affiche :",
    q2a: "50 %",
    q2b: "10 %",
    q2c: "Toujours 0 %, un job rouge n'est pas un échec",
    q2bTip: "Avec un seul déploiement, les petits nombres bougent par grands pas : un job rouge sur deux, c'est 50 %.",
    q2cTip: "Un job de déploiement rouge, c'est exactement ce que compte le failure rate.",
    q2Ok: "Les petits nombres bougent par grands pas. La note porte sur la période, pas sur vous.",
    choose: "Haut et bas choisissent, Entrée répond. Ou touchez.",
    shipped: "Vous avez livré une fois, et les métriques DORA disent exactement ça.",
    info_checks: "Vous avez sauté {{n}} des trois contrôles de l'étape 1 : connaissez les étapes manuelles et regardez la production avant de créer quoi que ce soit.",
    info_verify: "Vous avez vérifié {{n}} choses sur 3 dans l'org de production : l'incident le plus courant après une release, c'est une ancienne fonctionnalité qui casse.",
    info_quick: "Vous avez raté le Quick Deploy : la validation a déjà exécuté les tests.",
    info_coins: "Vous avez mangé {{got}} légumes sur {{total}}.",
    arch5: "6 · Data Cloud",
    goal5: "Sautez en rythme, prenez une carotte dorée",
    goal5down: "Data Cloud est à terre : en route vers l'arrivée",
    coachCarrot: "Une carotte dorée : foncez dessus !",
    coachBlaster: "Lance-légumes : le cochon d'Inde tire tout seul !",
    coachAgain: "Data Cloud tient bon : encore un tour",
    coachDown: "Data Cloud n'a plus de vie !",
    s_carrot: "Lance-légumes",
    p_carrot: "Lance-légumes ! Les légumes volent vers Data Cloud",
    bossName: "Data Cloud",
    sayIn: "Un nouveau champ sur Account ? Personne ne m'a prévenu !",
    sayHit: "Aïe ! Pas les carottes !",
    sayAgain: "Toujours debout ! Encore !",
    sayDown: "D'accord, d'accord... la prochaine fois, mettez-moi dans un data kit.",
    bossBeaten: "Data Cloud est à terre",
    retryBoss: "Retour direct à Data Cloud : la release est faite",
    retryHint: "Réessayer reprend à Data Cloud.",
    e_stream: "Data stream en échec",
    e_stream_tip: "Un data stream lit sa source par une connexion de l'org où il tourne : créez la connexion dans chaque org, puis relancez le stream.",
    e_mapping: "Champ non mappé",
    e_mapping_tip: "Un nouveau champ n'arrive dans Data Cloud qu'une fois ajouté au data stream et mappé au data model.",
    e_kit: "Data kit non déployé",
    e_kit_tip: "Installer le package ne suffit pas : déployez le data kit dans l'org cible pour créer ce qu'il contient.",
    e_identity: "Identity resolution pas prête",
    e_identity_tip: "Les profils unifiés n'existent qu'une fois le ruleset d'identity resolution exécuté : les segments construits dessus l'attendent.",
    e_segment: "Segment pas rafraîchi",
    e_segment_tip: "Un segment montre les membres de son dernier rafraîchissement : rafraîchissez-le une fois les données arrivées.",
    e_dmo: "DMO introuvable",
    e_dmo_tip: "Un mapping vers un data model object personnalisé a d'abord besoin de cet objet dans l'org cible : déployez le data model avant les mappings.",
    e_space: "Data space manquant",
    e_space_tip: "Les métadonnées Data Cloud appartiennent à un data space : l'org cible a besoin du même data space.",
    e_activation: "Activation en échec",
    e_activation_tip: "Une activation envoie un segment vers une cible : cette activation target doit exister dans chaque org."
  })
};

/** The product words taken word for word from the labs, checked by scripts/verify/check-easter-egg.mjs. */
export const QUOTES = [
  { lab: "1.6", text: "Already run during the validation" },
  { lab: "2.4", text: "Mark as done" },
  { lab: "2.4", text: "1 to do by hand" },
  { lab: "3.6", text: "destructiveChanges.xml" },
  { lab: "3.6", text: "sf org login jwt" },
  { lab: "3.6", text: "Re-run all jobs" },
  { lab: "3.6", text: "Mark as done in preprod" },
  { lab: "3.6", text: "Process Deployment (sfdx-hardis)" },
  { lab: "3.6", text: "Deployments per week" },
  { lab: "3.6", text: "Lead time" },
  { lab: "3.6", text: "Failure rate" },
  { lab: "3.6", text: "Recovery" },
  { lab: "3.6", text: "Rework" },
  { lab: "3.6", text: "No data" },
  { lab: "3.6", text: "Last 90 days" }
];

// The numbers of a DORA card after a first release
const DORA = [
  { metric: "Deployments per week", value: "0.1 / week", rating: "Low" },
  { metric: "Lead time (median)", value: "5.7 d", rating: "High" },
  { metric: "Failure rate", value: "0 %", rating: "Elite" },
  { metric: "Recovery (median)", value: "No data", rating: "" },
  { metric: "Rework", value: "0 %", rating: "Elite" }
];
const RATING_COLORS = { Elite: "#2E844A", High: "#0176D3", Medium: "#DD7A01", Low: "#BA0517", "": "#706E6B" };

function el(tag, className, parent, text) {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (text !== undefined) {
    node.textContent = text;
  }
  if (parent) {
    parent.appendChild(node);
  }
  return node;
}

export function createWorld(ctx) {
  const { t, hud } = ctx;
  const verdict = ctx.judgePlan();
  const manualOk = verdict.deliverability.ok;
  // The try after running out of hearts at the boss starts at it
  const startAt = Number(ctx.params && ctx.params.startAt) || 0;
  const retry = bossRetry && Date.now() - bossRetry.at < BOSS_RETRY_MS ? bossRetry : null;
  bossRetry = null;

  /* ---------- The track ---------- */

  const look = (id, color, glyph, sign, title, extra) => Object.assign({ id, color, glyph, sign: t(sign), title: t(title), tip: t(title + "_tip") }, extra);
  const LOOKS = {
    green: look("green", SLDS.warningDark, "check", "s_green", "o_green"),
    fail: look("fail", SLDS.purple, "error", "s_fail", "o_fail"),
    prod: look("prod", SLDS.errorDark, "error", "s_prod", "o_prod"),
    drift: look("drift", SLDS.warningDark, "warning", "s_drift", "o_drift", { signEvery: true }),
    half: look("half", SLDS.error, "loop", "s_half", "o_half"),
    old: look("old", SLDS.errorDark, "flow", "s_old", "o_old"),
    tests: look("tests", SLDS.purple, "code", "s_quick", "o_tests", { group: "tests", sign: "" }),
    latemain: look("latemain", SLDS.warningDark, "warning", "s_late", "o_latemain", { signEvery: true })
  };
  // The bonus pickups on the beat: vegetables, as in world 0
  const COIN = { id: "veg", vegetable: true, color: "#2E844A", glyph: "star" };
  const OK = { id: "ok", color: SLDS.success, glyph: "check" };
  const L = createLevel();
  const part = (bar, color, archKey) => {
    L.zone(bar * BAR, color);
    L.arch(bar * BAR + 0.6, t(archKey), { color: "#" + color.toString(16).padStart(6, "0") });
  };
  // Each check, key and component is the salesforce item of what it means
  const ITEM = { check1: "check-pass", check2: "check-warn", check3: "org-cloud", jwt: "permission-set", quick: "lwc", v1: "custom-field", v2: "lwc", v3: "record" };
  const POWER = (id, color, glyph) => ({ id, model: ITEM[id], color, glyph, sign: t("s_" + id) });

  // Part 1: the three checks worth checking
  part(0, 0xffb400, "arch0");
  L.music(0, "intro");
  L.music(2 * BAR, "verse");
  const p1 = { block: LOOKS.green, coin: COIN };
  ["..--", "-.--", "x.--", "x.-.", "x.x.", "-.--"].forEach((p, i) => L.riff(i, p, p1));
  L.power(1 * BAR + 1, POWER("check1", SLDS.success, "check"));
  L.power(3 * BAR + 2, POWER("check2", SLDS.warningDark, "warning"));
  L.power(5 * BAR + 1, POWER("check3", SLDS.brand, "eye"));

  // Part 2: the rehearsal in preprod, where a mistake costs nothing
  L.checkpoint(6 * BAR);
  part(6, 0x9050e9, "arch1");
  L.soft(6 * BAR, 18 * BAR);
  const p2 = { block: LOOKS.fail, coin: COIN };
  L.riff(6, "--..", p2);
  L.power(6 * BAR + 2, POWER("jwt", SLDS.navy, "lock"), true);
  L.riff(7, "-...", p2);
  if (manualOk) {
    L.manual(8 * BAR, { header: t("stopHeader"), button: t("stopButton"), id: "preprod" });
  } else {
    L.block(7 * BAR + 2, LOOKS.latemain);
  }
  L.riff(8, "..-.", p2);
  RIFF.forEach((p, i) => L.riff(9 + i, p, p2));
  L.riff(17, "s-..", p2);
  // Victor's note, at the top of the spring's jump, at the end of the rehearsal
  L.note(17 * BAR + 1, 2 * 2.3 + 0.45);

  // Part 3: the production Pull Request
  L.checkpoint(18 * BAR);
  part(18, 0x032d60, "arch2");
  const p3 = { block: LOOKS.prod, coin: COIN };
  L.riff(18, "--..", p3);
  L.power(18 * BAR + 2, { id: "jwt2", model: "permission-set", color: SLDS.navy, glyph: "lock", sign: t("s_jwt2") }, true);
  L.riff(19, "-...", p3);
  if (manualOk) {
    L.manual(20 * BAR, { header: t("stopHeader"), button: t("stopButton"), id: "prod" });
  } else {
    L.block(19 * BAR + 2, LOOKS.latemain);
  }
  L.riff(20, "..-.", p3);
  L.riff(21, "-.-.", p3);
  L.choice(22 * BAR, {
    header: t("choiceHeader"),
    rounds: [
      {
        prompt: t("q0"),
        detail: t("q0d"),
        lesson: t("q0Ok"),
        options: [
          { label: t("q0b"), ok: false, tip: t("q0bTip") },
          { label: t("q0a"), ok: true },
          { label: t("q0c"), ok: false, tip: t("q0cTip") }
        ]
      }
    ]
  });
  L.riff(22, "..-.", p3);

  // Part 4: merge, and stay: the same riff, for real, with drift
  L.checkpoint(23 * BAR);
  part(23, 0xe3066a, "arch3");
  L.music(23 * BAR, "chorus");
  L.riff(23, "-.--", p3);
  L.power(23 * BAR + 1, POWER("quick", SLDS.purple, "bolt"));
  L.block(24 * BAR, LOOKS.tests, { convert: OK });
  L.block(24 * BAR + 2, LOOKS.tests, { convert: OK });
  L.riff(24, ".-.-", p3);
  RIFF.forEach((p, i) => L.riff(25 + i, p, p3));
  // The one thing preprod did not have
  L.block(26 * BAR + 3, LOOKS.drift);
  L.checkpoint(30 * BAR);
  L.riff(33, "x-..", { block: LOOKS.half, coin: COIN });
  L.riff(34, "--..", p3);

  // Part 5: verify in production, the new story and an old one
  L.checkpoint(35 * BAR);
  part(35, 0x2e844a, "arch4");
  const p5 = { block: LOOKS.old, coin: OK };
  ["-.--", "x.-.", "-.--", "x.x.", "-.--", "----"].forEach((p, i) => L.riff(35 + i, p, p5));
  L.power(35 * BAR + 1, POWER("v1", SLDS.brand, "gear"));
  L.power(37 * BAR + 1, POWER("v2", SLDS.teal, "flow"));
  L.power(39 * BAR + 1, POWER("v3", SLDS.success, "check"));

  // Part 6: the Data Cloud throws its errors on the beat, a checkpoint at each round
  L.checkpoint(BOSS_BAR * BAR);
  part(BOSS_BAR, 0x5a4fcf, "arch5");
  L.music(BOSS_BAR * BAR, "boss");
  const errorLooks = ERRORS.map((key) => ({ id: "dc-" + key, color: DC.block, glyph: "error", sign: t("e_" + key), title: t("e_" + key), tip: t("e_" + key + "_tip"), group: "boss", signEvery: true, signHeight: 0.46, signAnchor: 0.76, burst: 0x7473b5 }));
  // A carrot is on the ground, a little up: taken by running into it, missed only from the top of a jump
  const { powers: carrots } = bossRounds(L, {
    bar: BOSS_BAR,
    roundBars: ROUND_BARS,
    rounds: ROUNDS,
    look: (n) => errorLooks[n % errorLooks.length],
    power: () => ({ id: "carrot", model: "carrot", color: SLDS.warningDark, glyph: "bolt", sign: t("s_carrot"), y: 0.85, size: 1.3 })
  });

  // The song speeds up part by part, on bar lines: production plays the riff of preprod faster
  [
    [6, 1.06],
    [18, 1.12],
    [23, 1.2],
    [35, 1.28]
  ].forEach(([bar, pace]) => L.tempo(bar * BAR, pace));
  L.end(END_BAR * BAR, { text: t("s_dora"), glyph: "star", color: SLDS.navy });

  /* ---------- The story on the way ---------- */

  const path = (i) => hud.setPath([t("path0"), t("path1"), t("path2"), t("path3"), t("path4")], i);
  L.script(0, () => {
    path(0);
    hud.goal(t("goal0"));
  });
  L.script(6 * BAR, (api) => {
    path(1);
    hud.goal(t("goal1"));
    api.coach(t("coachRehearse"), 2800, true);
  });
  if (manualOk) {
    L.script(7 * BAR, () => hud.goal(t("goal1manual")));
    L.script(8 * BAR + 1, () => hud.goal(t("goal1")));
  }
  L.script(18 * BAR, () => {
    path(2);
    hud.goal(t("goal2"));
  });
  L.script(23 * BAR, () => {
    path(3);
    hud.goal(t("goal3"));
    hud.tick("Deployment mode: FULL + Quick Deploy");
  });
  L.script(25 * BAR - 1, (api) => api.coach(t("coachProd"), 2600, true));
  L.script(34 * BAR, () => {
    hud.tick(t("mainGreen"));
    ctx.sound.play("gate");
  });
  L.script(35 * BAR, (api) => {
    path(4);
    hud.goal(t("goal4"));
    api.coach(t("coachVerify"), 2800, true);
  });
  L.script(BOSS_BAR * BAR, () => {
    // The pipeline is done: every step of the path is green. The rabbit speaks for itself
    path(5);
    hud.goal(t("goal5"));
  });

  let phase = "run";
  let finished = false;
  let card = null;
  let quiz = null;
  // The run plays with a context of its own: a retry starts at the boss, and the
  // last heart lost there says so on the result card
  const runCtx = Object.create(ctx, {
    params: { value: { startAt: retry ? BOSS_BAR * BAR : startAt } },
    loseAttempt: { value: loseAttempt }
  });
  const run = createMusicalRun(runCtx, {
    song: SONG,
    level: L,
    palette: [0x9050e9, 0xe3066a, 0xffb400, 0x06a59a, 0x1b96ff, 0x2e844a],
    scenery: SCENERY,
    coinModels: { ok: "check-pass" },
    pitModel: "check-fail",
    checkpointModel: "check-pass",
    // The release: the rocket takes off when the world is done, past the Cloudity logo
    // (the shell shows the badge itself, beside its celebration card)
    finish: [{ name: "rocket", height: 3.6 }],
    finishLine: { name: "cloudity-logo", height: 1.3 },
    // The errors of part 6 leave from the Data Cloud's paw
    thrower: (v) => throwFrom(v),
    callbacks: {
      onThrow() {
        bossThrows();
      },
      onHit() {
        // Back to the checkpoint: the carrots of the round come back, the blaster stops
        bossSetBack();
      },
      onPower(power) {
        if (power.id === "carrot") {
          takeCarrot(power);
          return;
        }
        const toast = { check1: "p_check1", check2: "p_check2", check3: "p_check3", jwt: "p_jwt", jwt2: "p_jwt2", quick: "p_quick", v1: "p_v1", v2: "p_v2", v3: "p_v3" }[power.id];
        if (toast) {
          hud.toast(t(toast), "power");
        }
        if (power.id === "quick") {
          run.convert("tests");
          run.coach(t("coachQuick"), 2600, true);
        }
      },
      onSoftHit(look) {
        if (look) {
          hud.tip(look.tip);
        }
      },
      onManual(stop) {
        ctx.collect(150, t(stop.event.id === "preprod" ? "stopDone1" : "stopDone2"));
      },
      onEnd() {
        showDora();
      },
      onEndAction(name) {
        doraAction(name);
      }
    }
  });

  /* ---------- The boss: the Data Cloud ---------- */

  const { THREE, camera, engine, sound, pig } = ctx;
  // What this world made itself, freed with it (the models' own parts belong to the pack)
  const owned = [];
  const boss = { state: "away", hp: BOSS_HP, rise: 0, hit: 0, throwing: 0, droop: 0, down: 0, blink: 2.5, downX: 0, loops: 0, thrown: 0, shots: 0, carrotCoached: false, blasterCoached: false };
  const rabbit = new THREE.Group();
  rabbit.visible = false;
  ctx.root.add(rabbit);
  const model = (ctx.models && ctx.models.get("data-cloud", { height: 1 })) || codeRabbit();
  rabbit.add(model);
  // The nodes that move, with their rest pose
  const nodes = {};
  for (const name of ["head", "ear-l", "ear-r", "paw-l", "paw-r", "eye-l", "eye-r"]) {
    const o = model.getObjectByName("data-cloud-" + name);
    if (o) {
      nodes[name] = { o, rot: o.rotation.clone(), scale: o.scale.clone() };
    }
  }
  // Its own materials, so a hit can flash it and its defeat turn it grey
  const tinted = [];
  model.traverse((child) => {
    if (!child.isMesh) {
      return;
    }
    child.material = child.material.clone();
    owned.push(child.material);
    // It floats high over the lawn: its shadow would cost a second draw of each part for little
    child.castShadow = false;
    const c = child.material.color;
    if (c && child.material.emissive && c.r + c.g + c.b > 1.2) {
      tinted.push({ material: child.material, color: c.clone() });
    }
  });
  const grey = new THREE.Color(0x9a98b8);
  const flash = new THREE.Color(1, 0.42, 0.42);
  const v = new THREE.Vector3();
  // The carrots make the guinea pig fire vegetables at its head (musical.js)
  const blaster = createBossBlaster(ctx, run, {
    id: "carrot",
    powers: carrots,
    models: VEG_SHOTS,
    colors: VEG_COLORS,
    beats: BLASTER_BEATS,
    perBeat: SHOTS_PER_BEAT,
    flight: SHOT_BEATS,
    aim: aimAtHead,
    onHit: (shot, at) => hitBoss(shot, at),
    onFire: () => {
      boss.shots += 1;
      sound.play("throw");
    }
  });

  // Its life, under the top bar, and what it says, beside its head
  const bossBar = el("div", "gr-w8-bossbar", hud.extra);
  bossBar.hidden = true;
  el("strong", "", bossBar, t("bossName"));
  const bossFill = el("b", "", el("i", "", bossBar));
  const sayNode = el("div", "gr-w8-say", hud.layer);
  sayNode.hidden = true;
  const bubble = { from: 0, until: 0, px: -1, py: -1 };
  const shown = {};
  let autoplay = false;

  // The check plays the boss by itself, on the exact beats (window.__guineaRun only exists for checks)
  if (window.__guineaRun) {
    window.__guineaRun.w8 = {
      autoplay(on) {
        autoplay = on !== false;
      }
    };
  }

  /** The last heart lost at the boss: the result card says the next try starts there. */
  function loseAttempt(title, tip) {
    const atBoss = boss.state === "fight";
    const last = atBoss && ctx.attempts <= 1;
    const left = ctx.loseAttempt(title, last ? (tip ? tip + " " : "") + t("retryHint") : tip);
    if (!ctx.playing && atBoss) {
      const s = wayStats();
      bossRetry ={ at: Date.now(), checks: checksTaken(), verified: verified(), quick: quickTaken(), got: s.got, coins: s.coins, vegetables: s.vegetables };
    }
    return left;
  }

  function updateBoss(dt, time) {
    if (boss.state === "away") {
      if (run.beat < BOSS_BAR * BAR - 2) {
        return;
      }
      enterBoss();
    }
    // The last round again, while the Data Cloud still stands
    if (boss.state === "fight" && run.mode === "run" && run.beat >= ROUNDS_END) {
      playAgain();
    }
    coachCarrot(blaster.update(time, boss.state === "fight"));
    placeRabbit(dt, time);
    placeBubble();
    writeBossData();
  }

  function enterBoss() {
    ctx.bossStarted();
    boss.state = "fight";
    boss.rise = 0;
    rabbit.visible = true;
    bossBar.hidden = false;
    renderBossBar();
    sound.play("bossIn");
    say(t("sayIn"), 3.2);
  }

  function bossThrows() {
    boss.throwing = 1;
    boss.thrown += 1;
    sound.play("bossThrow");
  }

  /** Where a thrown error leaves from: the paw on the guinea pig's side. */
  function throwFrom(out) {
    const paw = nodes["paw-r"];
    if (rabbit.visible && boss.rise > 0.5 && paw) {
      paw.o.getWorldPosition(out);
    } else {
      const P = engine.portrait ? BOSS_PHONE : BOSS_DESK;
      out.set(camera.position.x + P.dx - P.height * 0.25, P.y + P.height * 0.35, P.z);
    }
    return out;
  }

  function takeCarrot(power) {
    blaster.take(power.n, boss.state === "fight");
    if (boss.state !== "fight") {
      ctx.points(20);
      return;
    }
    hud.toast(t("p_carrot"), "power");
    if (!boss.blasterCoached) {
      boss.blasterCoached = true;
      run.coach(t("coachBlaster"), 2400, true);
    }
  }

  /** A hit or a new round sends the guinea pig to the checkpoint: the carrots from there come back. */
  function bossSetBack() {
    blaster.setBack();
  }

  function playAgain() {
    bossSetBack();
    if (run.again()) {
      boss.loops += 1;
      run.coach(t("coachAgain"), 2600, true);
      say(t("sayAgain"), 2.2, 2.7);
    }
  }

  /** Where the vegetables fly: its head. */
  function aimAtHead(out) {
    const head = nodes.head;
    if (head) {
      head.o.getWorldPosition(out);
      out.y += rabbit.scale.y * 0.3;
    } else {
      out.copy(rabbit.position).y += rabbit.scale.y * 0.6;
    }
    return out;
  }

  function hitBoss(shot, aim) {
    if (boss.state !== "fight") {
      return;
    }
    boss.hp = Math.max(0, boss.hp - 1);
    boss.hit = 1;
    ctx.points(5);
    sound.play("bossHit");
    ctx.fx.burst(aim.x, aim.y, aim.z, { count: 7, colors: [shot.color, 0xffffff], speed: 3, up: 2.5, life: 0.5 });
    renderBossBar();
    // Not while the coach line of the first carrot is up: they would sit on each other
    if (boss.hp === BOSS_HP - 14 || boss.hp === BOSS_HP / 2) {
      say(t("sayHit"), 1.8, 0, true);
    }
    if (boss.hp <= 0) {
      defeatBoss();
    }
  }

  function defeatBoss() {
    ctx.bossBeaten();
    boss.state = "down";
    boss.down = 0;
    // It sinks once its last line has been read
    boss.sinkAt = Math.max(1.5, readingMs(t("sayDown")) / 1000 - 1);
    blaster.stop();
    bossRetry = null;
    // Its errors still ahead pop, the band goes back to the chorus
    run.convert("boss");
    run.music.setSection("chorus", run.music.bar + 1);
    sound.play("bossDown");
    ctx.collect(300, t("bossBeaten"));
    hud.goal(t("goal5down"));
    say(t("sayDown"), 4.2);
    bossBar.classList.add("is-down");
    ctx.fx.burst(rabbit.position.x, rabbit.position.y + rabbit.scale.y * 0.6, rabbit.position.z, { count: 50, colors: [0xffffff, 0x7473b5, 0xbec7f6, 0x1f1646], speed: 5, up: 5, life: 1.4 });
  }

  function renderBossBar() {
    bossFill.style.width = Math.max(0, (boss.hp / BOSS_HP) * 100) + "%";
    bossBar.classList.toggle("is-low", boss.hp > 0 && boss.hp <= BOSS_HP * 0.25);
  }

  /** The rabbit floats right of the guinea pig and moves with the camera, until it is down. */
  function placeRabbit(dt, time) {
    const P = engine.portrait ? BOSS_PHONE : BOSS_DESK;
    const spb = run.music.secondsPerBeat;
    const pulse = engine.motion ? run.music.pulse : 0;
    boss.rise = Math.min(1, boss.rise + dt / (spb * 2));
    boss.hit = Math.max(0, boss.hit - dt * 5);
    boss.throwing = Math.max(0, boss.throwing - dt / (spb * 0.8));
    // Rising from behind the lawn, a little past its place, then settling
    const r = boss.rise;
    const rise = 1 + 2.7 * Math.pow(r - 1, 3) + 1.7 * Math.pow(r - 1, 2);
    let x = camera.position.x + P.dx;
    let y = P.y - (1 - rise) * (P.y + P.height + 1) + (engine.motion ? Math.sin(time * 2.1) * 0.14 : 0);
    if (boss.state === "down") {
      // It sags in front of the player for a moment, then the guinea pig runs on and it sinks behind the lawn
      boss.down += dt;
      boss.droop = Math.min(1, boss.down / 0.6);
      const sink = Math.max(0, boss.down - (boss.sinkAt || 1.5));
      if (sink > 0) {
        x = boss.downX;
      } else {
        boss.downX = x;
      }
      y = P.y - sink * sink * 2.6 - boss.droop * 0.3;
      if (y < -P.height - 1) {
        rabbit.visible = false;
        boss.state = "gone";
      }
    }
    // Squashed on the beat and by a hit, a little more when it throws
    const sx = 1 + pulse * 0.025 + boss.hit * 0.08 + boss.droop * 0.06;
    const sy = 1 - pulse * 0.035 - boss.hit * 0.1 - boss.droop * 0.12;
    rabbit.scale.set(P.height * sx, P.height * sy, P.height * sx);
    rabbit.position.set(x, y, P.z);
    rabbit.rotation.z = boss.droop * 0.22;
    poseRabbit(dt, time);
    // Flash on a hit, grey once down
    for (const m of tinted) {
      m.material.color.copy(m.color).lerp(grey, boss.droop * 0.55);
      m.material.emissive.copy(flash).multiplyScalar(boss.hit * 0.6);
    }
    rabbit.updateMatrixWorld(true);
  }

  function poseRabbit(dt, time) {
    const sway = engine.motion ? Math.sin(time * 3) * 0.08 : 0;
    const swing = Math.sin(Math.PI * (1 - boss.throwing)) * (boss.throwing > 0 ? 1 : 0);
    const flop = boss.hit * 0.3 + boss.droop * 1.1;
    pose("head", 0, boss.throwing * 0.12 - boss.hit * 0.12, (engine.motion ? Math.sin(time * 1.6) * 0.06 : 0) + boss.droop * 0.25);
    // Ears: the left one (+X) leans out with a turn about -Z, the right one about +Z
    pose("ear-l", 0, 0, -(sway + flop) - boss.throwing * 0.15);
    pose("ear-r", 0, 0, sway + flop + boss.throwing * 0.15);
    // The paw on the guinea pig's side goes up over the head and throws forward and out
    pose("paw-r", -swing * 2, 0, -swing * 0.5);
    pose("paw-l", 0, 0, engine.motion ? Math.sin(time * 2.4) * 0.1 : 0);
    // Blinks now and then; squeezed on a hit; closed once down
    boss.blink -= dt;
    if (boss.blink < -0.12) {
      boss.blink = 2 + ((time * 7.3) % 2);
    }
    const open = boss.droop > 0 ? 1 - boss.droop * 0.88 : boss.blink < 0 ? 0.12 : 1 - boss.hit * 0.6;
    for (const name of ["eye-l", "eye-r"]) {
      const eye = nodes[name];
      if (eye) {
        eye.o.scale.set(eye.scale.x, eye.scale.y * open, eye.scale.z);
      }
    }
  }

  function pose(name, rx, ry, rz) {
    const n = nodes[name];
    if (n) {
      n.o.rotation.set(n.rot.x + rx, n.rot.y + ry, n.rot.z + rz);
    }
  }

  /** The first time the gold ring turns round a carrot near the guinea pig (musical.js), the coach says what it is. */
  function coachCarrot(next) {
    if (next && !boss.carrotCoached && next.x - camera.position.x < 14 && next.beat - run.beat < 3) {
      boss.carrotCoached = true;
      run.coach(t("coachCarrot"), 2000, true);
    }
  }

  /** A line in the bubble for a few seconds, after a delay when a coach line is up first. */
  function say(text, seconds, delay, reaction) {
    // A reaction never cuts a line still being read; every line stays its reading time
    if (reaction && engine.time < (bubble.read || 0)) {
      return;
    }
    const read = readingMs(text) / 1000;
    seconds = Math.max(seconds, read);
    bubble.read = reaction ? 0 : engine.time + (delay || 0) + read;
    sayNode.textContent = text;
    sayNode.hidden = true;
    bubble.from = engine.time + (delay || 0);
    bubble.until = bubble.from + seconds;
    bubble.px = -1;
  }

  /** The speech bubble sits left of the head, kept on the screen. */
  function placeBubble() {
    const head = nodes.head;
    const on = engine.time >= bubble.from && engine.time <= bubble.until && rabbit.visible && head;
    if (!on) {
      sayNode.hidden = true;
      return;
    }
    sayNode.hidden = false;
    head.o.getWorldPosition(v);
    v.x -= rabbit.scale.x * 0.3;
    v.y += rabbit.scale.y * 0.22;
    v.project(camera);
    const w = hud.layer.clientWidth;
    const h = hud.layer.clientHeight;
    const width = sayNode.offsetWidth;
    const px = Math.round(Math.min(w - 8, Math.max(width + 8, ((v.x + 1) / 2) * w)));
    const py = Math.round(Math.min(h * 0.6, Math.max(h * 0.2, ((1 - v.y) / 2) * h)));
    if (px !== bubble.px || py !== bubble.py) {
      bubble.px = px;
      bubble.py = py;
      sayNode.style.transform = "translate(" + px + "px, " + py + "px) translate(-100%, -50%)";
    }
  }

  function writeBossData() {
    const values = { boss: boss.state, bosshp: boss.hp, thrown: boss.thrown, shots: boss.shots, loops: boss.loops };
    for (const [name, value] of Object.entries(values)) {
      if (shown[name] !== value) {
        shown[name] = value;
        ctx.setData(name, value);
      }
    }
  }

  /** For the check: a jump on the exact beat of every target, whatever the frame rate (musical.js). */
  function autoJump() {
    if (autoplay) {
      run.autoJump();
    }
  }

  /** The rabbit drawn from code, when the model could not load: the same nodes, plainer. */
  function codeRabbit() {
    const sphere = new THREE.SphereGeometry(1, 20, 14);
    owned.push(sphere);
    const material = (color, extra) => {
      const m = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.55 }, extra));
      owned.push(m);
      return m;
    };
    const white = material(0xffffff);
    const lavender = material(0x7473b5);
    const navy = material(0x1f1646, { roughness: 0.9 });
    const line = material(0x1f1646, { roughness: 0.9, side: THREE.BackSide });
    const group = (parent, name, x, y, z) => {
      const g = new THREE.Group();
      g.name = name;
      g.position.set(x, y, z);
      parent.add(g);
      return g;
    };
    const blob = (parent, m, x, y, z, sx, sy, sz) => {
      const mesh = new THREE.Mesh(sphere, m);
      mesh.position.set(x, y, z);
      mesh.scale.set(sx, sy, sz);
      parent.add(mesh);
      return mesh;
    };
    const root = new THREE.Group();
    const cloud = group(root, "data-cloud-cloud", 0, 0, 0);
    for (const [x, s] of [
      [-0.42, 0.2],
      [0, 0.26],
      [0.42, 0.2]
    ]) {
      blob(cloud, material(0xe6e9fd), x, s, 0, s * 1.5, s, s);
    }
    const body = group(root, "data-cloud-body", 0, 0.3, 0);
    blob(body, white, 0, 0.18, 0, 0.3, 0.22, 0.26);
    for (const side of [1, -1]) {
      const paw = group(root, side > 0 ? "data-cloud-paw-l" : "data-cloud-paw-r", side * 0.27, 0.48, 0.05);
      blob(paw, white, side * 0.04, -0.1, 0, 0.08, 0.12, 0.08);
    }
    const head = group(root, "data-cloud-head", 0, 0.52, 0);
    blob(head, white, 0, 0.34, 0, 0.5, 0.38, 0.38);
    blob(head, line, 0, 0.34, 0, 0.56, 0.44, 0.44);
    blob(head, lavender, 0, 0.27, 0.37, 0.06, 0.035, 0.03);
    for (const side of [1, -1]) {
      const eye = group(head, side > 0 ? "data-cloud-eye-l" : "data-cloud-eye-r", side * 0.27, 0.38, 0.33);
      blob(eye, navy, 0, 0, 0, 0.045, 0.075, 0.03);
      const ear = group(head, side > 0 ? "data-cloud-ear-l" : "data-cloud-ear-r", side * 0.13, 0.68, 0);
      ear.rotation.z = -side * 0.28;
      blob(ear, white, 0, 0.32, 0, 0.13, 0.34, 0.06);
      blob(ear, lavender, 0, 0.32, 0.04, 0.075, 0.25, 0.03);
      blob(ear, line, 0, 0.32, 0, 0.17, 0.38, 0.09);
    }
    root.scale.setScalar(1 / 1.55);
    return root;
  }

  /* ---------- The DORA card ---------- */

  const QUESTIONS = [
    { q: "q1", answers: [{ key: "q1a", ok: true }, { key: "q1b", tip: "q1bTip" }, { key: "q1c", tip: "q1cTip" }], lesson: "q1Ok" },
    { q: "q2", answers: [{ key: "q2a", ok: true }, { key: "q2b", tip: "q2bTip" }, { key: "q2c", tip: "q2cTip" }], lesson: "q2Ok" }
  ];
  let question = 0;
  let choice = 0;
  let buttons = [];

  function showDora() {
    phase = "dora";
    ctx.setData("phase", "dora");
    // The card says what to do; on a phone the goal line and the jump pad would cover it
    hud.goal("");
    hud.setPath([], 0);
    hud.setPads([]);
    bossBar.hidden = true;
    sayNode.hidden = true;
    card = el("div", "gr-w8-card gr-scroll", hud.layer);
    const head = el("div", "gr-w8-head", card);
    el("strong", "", head, t("doraTitle"));
    el("span", "", head, t("doraPeriod"));
    const grid = el("div", "gr-w8-grid", card);
    for (const row of DORA) {
      const cell = el("div", "gr-w8-metric", grid);
      el("span", "gr-w8-name", cell, row.metric);
      el("strong", "gr-w8-value", cell, row.value);
      if (row.rating) {
        const badge = el("span", "gr-w8-rating", cell, row.rating);
        badge.style.background = RATING_COLORS[row.rating];
      }
    }
    quiz = el("div", "gr-w8-quiz", card);
    ask(0);
  }

  function ask(index) {
    question = index;
    ctx.setData("question", index + 1);
    quiz.replaceChildren();
    const q = QUESTIONS[index];
    el("p", "gr-w8-question", quiz, t(q.q));
    el("p", "gr-w8-hint", quiz, t("choose"));
    const answers = q.answers.slice().sort(() => ctx.random() - 0.5);
    buttons = answers.map((answer, i) => {
      const button = el("button", "gr-w8-answer", quiz, t(answer.key));
      button.type = "button";
      button.dataset.ok = answer.ok ? "1" : "0";
      button.addEventListener("click", () => {
        choice = i;
        answerWith(answer, button);
      });
      return button;
    });
    choice = 0;
    highlight();
  }

  function highlight() {
    buttons.forEach((b, i) => b.classList.toggle("is-chosen", i === choice));
  }

  function answerWith(answer, button) {
    if (!ctx.playing || finished) {
      return;
    }
    const q = QUESTIONS[question];
    if (answer.ok) {
      ctx.sound.play("wheek");
      ctx.collect(250, t(q.lesson));
      if (question + 1 < QUESTIONS.length) {
        ask(question + 1);
      } else {
        finished = true;
        hud.toast(t("shipped"), "good");
        run.finale();
        run.launch();
        const info = missedInfo();
        ctx.setData("missed", info ? "yes" : "no");
        ctx.finish(bonus(), info);
      }
    } else {
      button.disabled = true;
      button.classList.add("is-wrong");
      ctx.loseAttempt(t(answer.key), t(answer.tip));
      // The cursor leaves the wrong answer, so Enter never picks it twice
      const open = buttons.findIndex((b) => !b.disabled);
      if (open >= 0) {
        choice = open;
        highlight();
      }
    }
  }

  function doraAction(name) {
    if (phase !== "dora" || !buttons.length) {
      return;
    }
    const step = name === "jump" || name === "left" ? -1 : name === "duck" || name === "right" ? 1 : 0;
    if (step) {
      for (let i = 0; i < buttons.length; i++) {
        choice = (choice + step + buttons.length) % buttons.length;
        if (!buttons[choice].disabled) {
          break;
        }
      }
      highlight();
    } else if (name === "confirm" && !buttons[choice].disabled) {
      buttons[choice].click();
    }
  }

  // A try that started at the boss counts what the try before it did on the way there
  function checksTaken() {
    return retry ? retry.checks : ["check1", "check2", "check3"].filter((id) => run.powerTaken(id)).length;
  }

  function verified() {
    return retry ? retry.verified : ["v1", "v2", "v3"].filter((id) => run.powerTaken(id)).length;
  }

  function quickTaken() {
    return retry ? retry.quick : run.powerTaken("quick");
  }

  function wayStats() {
    const s = run.stats;
    return retry ? Object.assign({}, s, { got: retry.got, coins: retry.coins, vegetables: retry.vegetables }) : s;
  }

  function bonus() {
    const s = wayStats();
    let points = 200 + Math.round((200 * s.got) / Math.max(1, s.coins));
    points -= (3 - checksTaken()) * 30 + (3 - verified()) * 30;
    if (!quickTaken()) {
      points -= 30;
    }
    return Math.max(0, points);
  }

  function missedInfo() {
    const lines = [];
    if (checksTaken() < 3) {
      lines.push(t("info_checks", { n: 3 - checksTaken() }));
    }
    if (verified() < 3) {
      lines.push(t("info_verify", { n: verified() }));
    }
    return endMissedInfo(lines, { powerTaken: (id) => (id === "quick" ? quickTaken() : run.powerTaken(id)) }, wayStats(), t);
  }

  const world = musicalWorld(
    run,
    () => finished,
    () => {
      if (card) {
        card.remove();
      }
      bossBar.remove();
      sayNode.remove();
      blaster.dispose();
      for (const thing of owned) {
        thing.dispose();
      }
      if (window.__guineaRun && window.__guineaRun.w8) {
        delete window.__guineaRun.w8;
      }
      ctx.setData("boss", "");
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
    autoJump();
    runUpdate(dt, time);
    if (!finished && ctx.playing) {
      updateBoss(dt, time);
    }
  };
  return world;
}

export const CSS =
  MUSICAL_CSS +
  `
.guinea-run .gr-w8-card {
  position: absolute;
  top: 50%;
  left: 50%;
  width: min(560px, calc(100vw - 24px));
  max-height: calc(100dvh - 150px);
  overflow-y: auto;
  overscroll-behavior: contain;
  transform: translate(-50%, -45%);
  border: 3px solid #032d60;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 6px 30px rgba(3, 45, 96, 0.45);
  pointer-events: auto;
  touch-action: pan-y;
  animation: gr-card-in 0.4s ease-out;
}
.guinea-run:not([data-state="playing"]) .gr-w8-card {
  visibility: hidden;
}
.guinea-run .gr-w8-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 10px 14px;
  border-bottom: 2px solid #c9c9c9;
  color: #032d60;
}
.guinea-run .gr-w8-head strong {
  font-size: 19px;
}
.guinea-run .gr-w8-head span {
  color: #444444;
  font-size: 14px;
}
.guinea-run .gr-w8-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 8px;
  padding: 10px 14px;
}
.guinea-run .gr-w8-metric {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  border: 1px solid #c9c9c9;
  border-radius: 8px;
}
.guinea-run .gr-w8-name {
  color: #444444;
  font-size: 13px;
}
.guinea-run .gr-w8-value {
  color: #032d60;
  font-size: 20px;
}
.guinea-run .gr-w8-rating {
  align-self: flex-start;
  padding: 1px 8px;
  border-radius: 999px;
  color: #ffffff;
  font-size: 12px;
  font-weight: 800;
}
.guinea-run .gr-w8-quiz {
  padding: 4px 14px 14px;
}
.guinea-run .gr-w8-question {
  margin: 6px 0 2px;
  color: #032d60;
  font-size: 16px;
  font-weight: 800;
}
.guinea-run .gr-w8-hint {
  margin: 0 0 8px;
  color: #444444;
  font-size: 13px;
}
.guinea-run .gr-w8-answer {
  display: block;
  width: 100%;
  min-height: 48px;
  margin: 6px 0;
  padding: 8px 12px;
  border: 2px solid #c9c9c9;
  border-radius: 10px;
  background: #ffffff;
  color: #181818;
  font: inherit;
  font-size: 15px;
  text-align: left;
  cursor: pointer;
  touch-action: manipulation;
}
.guinea-run .gr-w8-answer.is-chosen {
  border-color: #0176d3;
  box-shadow: 0 0 0 2px #0176d3;
  background: #eef4ff;
}
.guinea-run .gr-w8-answer.is-wrong {
  border-color: #ea001e;
  background: #fef1ee;
  color: #ba0517;
  text-decoration: line-through;
}
/* The Data Cloud's life, under the top bar */
.guinea-run .gr-w8-bossbar {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 240px;
  max-width: 520px;
  padding: 5px 12px;
  border: 2px solid #ffffff;
  border-radius: 12px;
  background: rgba(31, 22, 70, 0.92);
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.3);
  color: #ffffff;
  font-size: 14px;
  pointer-events: none;
}
.guinea-run .gr-w8-bossbar[hidden] {
  display: none;
}
.guinea-run .gr-w8-bossbar i {
  flex: 1 1 auto;
  display: block;
  min-width: 110px;
  height: 12px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.22);
}
.guinea-run .gr-w8-bossbar b {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #c9c6ff, #7473b5);
  transition: width 0.15s;
}
.guinea-run .gr-w8-bossbar.is-low b {
  background: linear-gradient(90deg, #ff5d2d, #ea001e);
  animation: gr-w8-blink 0.5s infinite;
}
.guinea-run .gr-w8-bossbar.is-down {
  opacity: 0.65;
}
@keyframes gr-w8-blink {
  50% {
    opacity: 0.45;
  }
}
/* At the boss there are no vegetables to eat: its bar takes the place of their count */
.guinea-run[data-boss="fight"] .gr-mu-veg,
.guinea-run[data-boss="down"] .gr-mu-veg {
  display: none;
}
/* What the Data Cloud says, left of its head */
.guinea-run .gr-w8-say {
  position: absolute;
  left: 0;
  top: 0;
  width: max-content;
  max-width: min(260px, 46vw);
  padding: 6px 12px;
  border: 2px solid #1f1646;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 3px 0 rgba(31, 22, 70, 0.35);
  color: #1f1646;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.25;
  pointer-events: none;
}
.guinea-run .gr-w8-say::after {
  content: "";
  position: absolute;
  top: 50%;
  right: -8px;
  width: 12px;
  height: 12px;
  border-top: 2px solid #1f1646;
  border-right: 2px solid #1f1646;
  background: #ffffff;
  transform: translateY(-50%) rotate(45deg);
}
.guinea-run .gr-w8-say[hidden] {
  display: none;
}
.guinea-run:not([data-state="playing"]) .gr-w8-say {
  visibility: hidden;
}
@media (max-width: 600px) {
  .guinea-run .gr-w8-bossbar {
    min-width: 0;
  }
  .guinea-run .gr-w8-say {
    padding: 4px 9px;
    font-size: 13px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .guinea-run .gr-w8-bossbar.is-low b {
    animation: none;
  }
}
`;
