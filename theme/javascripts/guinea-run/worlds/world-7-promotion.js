/*
 * World 7, Promote to uat and preprod: a runner up the pipeline, carrying the
 * release (US-014, US-018, US-052, US-056, US-058, US-059, US-062).
 *
 * In uat: the merge method doors, where squash empties the release notes; the
 * package-no-overwrite shield that keeps the uat org's own ERP endpoint (the
 * Named Credential ERP_Endpoint); the Pull Requests and tickets of the release
 * notes to collect.
 * At the end of uat, the testers: two admins who never tested their story in
 * the uat org. The track holds while the guinea pig fights them: it grabs the
 * vegetables that fall on the track and throws them, each one a test done,
 * and dodges what they throw back (untested tickets, "Works on my machine"
 * bugs). The first one, beaten, validates US-062. The second one, owner of
 * US-058, escapes on sick leave just before the end of his tests: US-058 is
 * left untested in the uat branch, and that is why the next door asks for a
 * promotion branch.
 * In preprod: US-018 and US-052 went on Monday, five stories are left in uat,
 * three approved. The guinea pig builds a promotion branch with the three
 * approved ones only, carried as wagons behind it, then meets the cherry-pick
 * of US-059 that conflicts, because it was written on top of US-058, which
 * the preprod branch never got.
 *
 * The goal line always says what is next: the notes to fill, the tester to
 * make test, the door to pick, the manual step to mark as done, the stories
 * to carry. A player out of hearts at the admins tries again at the admins.
 */
import { createRunner, RUNNER_TEXTS, RUNNER_CSS } from "./runner.js";
import { pickAdmins } from "../core/faces.js";

export const PADS = ["left", "right", "jump", "duck", "confirm"];
// The Salesforce items of the track, and the Kenney islands far away
/** On a phone, toasts and tips sit above the pads: the track runs up the middle. */
export const PHONE_MESSAGES = "bottom";

// The vegetables the guinea pig throws at the testers
export const MODELS = ["salesforce", "platform", "vegetables"];

const UAT_LENGTH = 400;
const PREPROD_LENGTH = 420;
const NOTES_FULL = 20;
const APPROVED = ["us014", "us059", "us062"];
const NOT_APPROVED = ["us056", "us058"];
const STORY_LABELS = { us014: "US-014", us056: "US-056", us058: "US-058", us059: "US-059", us062: "US-062" };
// Where the stories come down the track, and where they are all behind
const STORIES_AT = UAT_LENGTH + 30;
const STORIES_END = STORIES_AT + 70 + 20 + 4 * 22 + 6;

// The testers: the track holds at BOSS_AT, before the promotion question is
// in sight, and the runner lays nothing of its own around them
const BOSS_AT = 285;
const BOSS_CLEAR = [BOSS_AT - 18, BOSS_AT + 70];
// They run backwards this far ahead of the guinea pig, and throw from there
const ADMIN_Z = -14;
const ADMIN_SCALE = 1.45;
// The face (a big round portrait for a head) in the admin's own units, and
// where a throw leaves his raised hand: above his head, to his right, in metres
const FACE_Y = 2.9;
const FACE_R = 0.8;
const HAND_X = 1.1;
const HAND_Y = 5.3;
// A thrown thing is in the air this long, then lies on the track
const FLIGHT = 0.5;
// A vegetable reaches the admin's face this fast
const TO_ADMIN = 0.42;
// Vegetables fall on the track this far ahead, from this high
const VEG_DROP_Z = 12;
const VEG_DROP_Y = 4.5;
// The pace of the run while they fight: calm, so every throw is read
const FIGHT_SPEED = 0.85;
// Each heart lost at the testers makes their throws this much slower, up to EASE_MAX
const EASE_PER_HIT = 0.15;
const EASE_MAX = 1.6;
// The full hearts of a world, to know when one more is worth giving
const HEARTS = 5;
// A player out of hearts at the admins starts the next try at them, within
// this long. Kept by the module, which outlives a world (each try is a fresh one)
const BOSS_RETRY_MS = 15 * 60000;
const BOSS_RETRY_RUNUP = 25;
let bossRetry = null;

const VEGETABLES = ["carrot", "bell-pepper", "cucumber"];
const VEGETABLE_COLORS = { carrot: 0xff8a3d, "bell-pepper": 0xe8473b, cucumber: 0x3e9b4f };
// every: the pause between two throws, windup: the warning before one,
// double: the chance of a throw in two lanes, veg: a vegetable every so often
const ADMINS = [
  { face: "", story: "US-062", name: "b1Name", hello: "b1Hello", half: "b1Half", goal: "goalBoss1", shirt: 0x3a6fb8, tests: 13, every: 1.7, windup: 1.1, double: 0, veg: 1.6 },
  { face: "", story: "US-058", name: "b2Name", hello: "b2Hello", half: "b2Half", goal: "goalBoss2", shirt: 0x8a4fd1, tests: 13, every: 1.4, windup: 0.95, double: 0.45, veg: 1.5, escapes: true }
];

export const TEXTS = {
  en: {
    ...RUNNER_TEXTS.en,
    intro: "The integration branch is green: now the release climbs to the uat branch, then to the preprod branch. Seven stories, from US-014 to US-062, and each one waits for its tester in the uat org. The release is Thursday and the date does not move.",
    how1: "Collect Pull Requests and tickets, and read each question before its door",
    how2: "Grab vegetables: they fly at the admins who did not test",
    how3: "For the preprod branch, carry only the 3 approved stories, the green ones",
    note: "Preview Upcoming Promotion Notes: the one to use on a Wednesday, when somebody asks what Thursday's release will contain. I never found it. - V.",
    s0: "uat branch",
    s1: "preprod branch",
    notes: "Promotion Notes - uat branch: Pull Requests {{prs}}, Tickets {{tickets}}",
    goalNotes: "Fill the Promotion Notes: {{n}} / 20",
    goalNotesFull: "Promotion Notes full: keep running to the preprod branch",
    goalDoor: "Read the question, steer into the right door",
    goalStop: "Press Enter: mark the manual step as done",
    goalStopTouch: "Tap the screen: mark the manual step as done",
    goalStories: "Carry the 3 approved stories (green): {{n}} / 3",
    goalEnd: "Run to the preprod branch: Thursday's release",
    goalBoss1: "Grab vegetables to make him test US-062: {{n}} / {{total}}",
    goalBoss2: "Grab vegetables to make him test US-058: {{n}} / {{total}}",
    goalSick: "US-058 stays untested in the uat branch",
    coachStart: "Collect Pull Requests and tickets!",
    coachStories: "Green stories only: dodge US-056 and US-058!",
    coachFull: "Promotion Notes full!",
    coachWagon: "{{id}} hooked on!",
    coachVeg: "Grab the vegetables: the guinea pig throws them at him!",
    coachBoss2: "Now the tester of US-058!",
    coachPromo: "US-058 is not validated: how do the others go?",
    mergeQ: "Merge the promotion into the uat branch. Which merge method?",
    promoQ: "The uat branch holds US-058, not validated, and US-056, still in test. Release Thursday: how do you promote?",
    pickQ: "US-059 (approved) was built on top of US-058 (not approved). Its cherry-pick conflicts: what do you keep?",
    mergeBanner: "Merge the promotion into the uat branch:",
    doorSquash: "Squash and merge",
    doorMergeCommit: "Create a merge commit",
    doorRebase: "Rebase and merge",
    doorSquash_s: "Squash",
    doorMergeCommit_s: "Merge commit",
    doorRebase_s: "Rebase",
    squashTip: "Use the arrow beside the green button and pick Create a merge commit: the release notes, the retrofit and the next promotion need every commit.",
    notesEmptied: "Squashed: the release notes are empty",
    o_erp: "ERP_Endpoint would point the uat org at the production ERP",
    o_erp_tip: "Add NamedCredential ERP_Endpoint to manifest/package-no-overwrite.xml: present means protected.",
    o_erp_s: "Prod URL",
    o_token: "Release notes: no git provider token",
    o_token_tip: "Without a token the release notes do not stop: they warn, collect zero Pull Requests, and write a perfectly formatted empty document.",
    o_token_s: "No token",
    o_markers: "Cannot merge into preprod: Git conflict markers in the promotion branch",
    o_markers_tip: "Nothing was deployed. Solve the markers on the promotion branch, commit, push.",
    o_markers_s: "Conflict markers",
    o_lateuat: "In uat: 1 to do by hand",
    o_lateuat_tip: "The manual step runs once in every org: do it in the uat org, mark it as done, then re-run the jobs.",
    o_lateuat_s: "Manual step",
    o_untested: "Untested ticket: nobody tried it in the uat org",
    o_untested_tip: "A story goes to the preprod branch once its tester has validated it in the uat org, not before.",
    o_untested_s: "Untested",
    o_machine: "Works on my machine",
    o_machine_tip: "Tested in a dev sandbox is not tested: the tester validates the story in the uat org, with the data and the users of the business.",
    o_machine_s: "Works on my machine",
    p_shield: "package-no-overwrite: ERP_Endpoint skipped, protected",
    p_shield_s: "No Overwrite",
    p_preview: "Preview Upcoming Promotion Notes",
    p_preview_s: "Preview",
    p_retry: "Re-run all jobs: one more attempt",
    p_retry_s: "Re-run jobs",
    item_pr: "Pull Request",
    item_ticket: "Ticket",
    item_us: "{{id}} approved",
    stopTitle: "Set Email Deliverability to All Email",
    stopHeader: "In uat: 1 to do by hand",
    stopHint: "The manual action runs in every org: do it in the uat org too.",
    stopButton: "Mark as done (Enter)",
    stopButtonTouch: "Mark as done (tap)",
    stopDone: "Done in the uat org too: the promotion goes on",
    promoBanner: "US-058 not validated, US-056 still in test: the uat branch cannot go as a whole.",
    doorAll: "Promote everything to the preprod branch",
    doorAllTip: "The ordinary promotion takes the whole uat branch: US-056 and US-058 would go too, and nobody validated them.",
    doorBranch: "Create a promotion branch: US-014, US-059, US-062",
    doorWait: "Wait until every story is approved",
    doorWaitTip: "The tester of US-058 is on sick leave and the release is Thursday: the sales team told Acme Corp they would see their customer tier on Friday.",
    doorAll_s: "Promote all",
    doorBranch_s: "Promotion branch",
    doorWait_s: "Wait",
    notApproved: "{{id}} is not approved: it stays in the uat branch",
    notApprovedTip: "Only the approved stories go into the promotion branch. The others wait in the uat branch for the next one.",
    carried: "{{id}} on the promotion branch",
    pickLine: "My US-059 was written on top of Romain's US-058. US-058 is not approved, so the cherry-pick of US-059 will conflict.",
    doorKeep: "Keep only the US-059 changes",
    doorTake: "Keep the US-058 changes too",
    doorTakeTip: "US-058 is not approved: it would slip into the release, and its new field does not exist in the preprod org, so the deployment fails.",
    doorDrop: "Leave US-059 out of the promotion",
    doorDropTip: "US-059 is approved: dropping it makes the promotion lie about the week. The conflict only means git is exact: keep the lines that belong to US-059.",
    doorKeep_s: "Only US-059",
    doorTake_s: "US-058 too",
    doorDrop_s: "Drop US-059",
    mariiaSquash: "GitHub remembers the last merge method. Look at the arrow before you click.",
    romainErp: "package-no-overwrite: present means protected. The uat org keeps calling erp-test.example.com, never the production ERP.",
    bossLine: "US-014 and US-059 are validated. US-062 and US-058 were never tested in the uat org: here come their testers.",
    mariiaSick: "Sick leave until next week: US-058 will not be validated before Thursday. The uat branch cannot go to the preprod branch as it is.",
    b1Name: "Admin, tester of US-062",
    b2Name: "Admin, tester of US-058",
    bossTests: "Tests in the uat org: {{n}} / {{total}}",
    b1Hello: "Test US-062? No time, I have meetings all day!",
    b1Half: "Ouch! OK, OK, I am logging in to the uat org...",
    b1Done: "Tested: US-062 does what I asked. Validated!",
    b2Hello: "US-058? I will test it next week. Or the one after.",
    b2Half: "Stop it! I feel... a bit feverish.",
    b2Escape: "Cough, cough... I don't feel well. Out of office: sick leave!",
    testStep: "Test {{n}} / {{total}} done",
    validatedSign: "US-062 validated",
    us062Validated: "US-062 validated in the uat org",
    sickSign: "Out of office: sick leave",
    us058Left: "US-058 not validated: its tester is on sick leave",
    retryHint: "Try again starts at the admins.",
    retryBoss: "Back at the admins, with your Promotion Notes",
    storiesLine: "US-018 and US-052 went to the preprod branch on Monday. Of the five left, US-014, US-059 and US-062 are approved: US-056 is still in test, and US-058 waits for its tester, on sick leave.",
    arrived: "The preprod org is ready for Thursday: the approved stories, and notes that say why.",
    shortNotes: "Release notes thin: collect the Pull Requests and tickets",
    shortNotesInfo: "The Promotion Notes listed {{n}} Pull Requests and tickets out of 20 or more. A release manager reads them before every promotion: what is missing there is what nobody checks.",
    missedStories: "The promotion branch carried {{n}} of the 3 approved stories: the others wait in the uat branch for the next promotion, and Thursday's release is short of them."
  },
  fr: {
    ...RUNNER_TEXTS.fr,
    intro: "La branch integration est au vert : la release monte vers la branch uat, puis vers la branch preprod. Sept stories, de US-014 à US-062, et chacune attend son testeur dans l'org uat. La release est jeudi et la date ne bouge pas.",
    how1: "Récupérez les Pull Requests et tickets, et lisez chaque question avant sa porte",
    how2: "Attrapez des légumes : ils volent vers les admins qui n'ont pas testé",
    how3: "Pour la branch preprod, ne prenez que les 3 stories approuvées, les vertes",
    note: "Preview Upcoming Promotion Notes : celle à utiliser le mercredi, quand quelqu'un demande ce que contiendra la release du jeudi. Je ne l'ai jamais trouvée. - V.",
    s0: "branch uat",
    s1: "branch preprod",
    notes: "Promotion Notes - branch uat : Pull Requests {{prs}}, Tickets {{tickets}}",
    goalNotes: "Remplissez les Promotion Notes : {{n}} / 20",
    goalNotesFull: "Promotion Notes pleines : continuez vers la branch preprod",
    goalDoor: "Lisez la question, prenez la bonne porte",
    goalStop: "Appuyez sur Entrée : marquez l'étape manuelle comme faite",
    goalStopTouch: "Touchez l'écran : marquez l'étape manuelle comme faite",
    goalStories: "Prenez les 3 stories approuvées (vertes) : {{n}} / 3",
    goalEnd: "Filez vers la branch preprod : la release du jeudi",
    goalBoss1: "Attrapez des légumes pour lui faire tester US-062 : {{n}} / {{total}}",
    goalBoss2: "Attrapez des légumes pour lui faire tester US-058 : {{n}} / {{total}}",
    goalSick: "US-058 reste non testée dans la branch uat",
    coachStart: "Récupérez les Pull Requests et les tickets !",
    coachStories: "Seulement les stories vertes : évitez US-056 et US-058 !",
    coachFull: "Promotion Notes pleines !",
    coachWagon: "{{id}} accrochée !",
    coachVeg: "Attrapez les légumes : le cochon d'Inde les lui lance !",
    coachBoss2: "Au tour du testeur de US-058 !",
    coachPromo: "US-058 n'est pas validée : comment partent les autres ?",
    mergeQ: "Merger la promotion dans la branch uat. Quelle méthode de merge ?",
    promoQ: "La branch uat contient US-058, non validée, et US-056, encore en test. Release jeudi : comment promouvoir ?",
    pickQ: "US-059 (approuvée) a été écrite par-dessus US-058 (non approuvée). Son cherry-pick est en conflit : que gardez-vous ?",
    mergeBanner: "Merger la promotion dans la branch uat :",
    doorSquash: "Squash and merge",
    doorMergeCommit: "Create a merge commit",
    doorRebase: "Rebase and merge",
    doorSquash_s: "Squash",
    doorMergeCommit_s: "Merge commit",
    doorRebase_s: "Rebase",
    squashTip: "Utilisez la flèche à côté du bouton vert et choisissez Create a merge commit : les notes de release, le retrofit et la promotion suivante ont besoin de chaque commit.",
    notesEmptied: "Squashée : les notes de release sont vides",
    o_erp: "ERP_Endpoint pointerait l'org uat vers l'ERP de production",
    o_erp_tip: "Ajoutez NamedCredential ERP_Endpoint à manifest/package-no-overwrite.xml : présent veut dire protégé.",
    o_erp_s: "URL de prod",
    o_token: "Notes de release : pas de token du git provider",
    o_token_tip: "Sans token, les notes de release ne s'arrêtent pas : elles avertissent, ne récupèrent aucune Pull Request, et écrivent un document vide parfaitement formaté.",
    o_token_s: "Pas de token",
    o_markers: "Cannot merge into preprod : marqueurs de conflit Git dans la branch de promotion",
    o_markers_tip: "Rien n'a été déployé. Résolvez les marqueurs sur la branch de promotion, commitez, poussez.",
    o_markers_s: "Marqueurs de conflit",
    o_lateuat: "In uat: 1 to do by hand",
    o_lateuat_tip: "L'étape manuelle s'exécute une fois dans chaque org : faites-la dans l'org uat, marquez-la comme faite, puis relancez les jobs.",
    o_lateuat_s: "Étape manuelle",
    o_untested: "Ticket non testé : personne ne l'a essayé dans l'org uat",
    o_untested_tip: "Une story part vers la branch preprod une fois que son testeur l'a validée dans l'org uat, pas avant.",
    o_untested_s: "Non testé",
    o_machine: "Ça marche sur ma machine",
    o_machine_tip: "Testé dans une sandbox de dev, ce n'est pas testé : le testeur valide la story dans l'org uat, avec les données et les utilisateurs du métier.",
    o_machine_s: "Ça marche chez moi",
    p_shield: "package-no-overwrite : ERP_Endpoint ignoré, protégé",
    p_shield_s: "No Overwrite",
    p_preview: "Preview Upcoming Promotion Notes",
    p_preview_s: "Preview",
    p_retry: "Re-run all jobs : un essai de plus",
    p_retry_s: "Re-run jobs",
    item_pr: "Pull Request",
    item_ticket: "Ticket",
    item_us: "{{id}} approuvée",
    stopTitle: "Set Email Deliverability to All Email",
    stopHeader: "In uat: 1 to do by hand",
    stopHint: "L'action manuelle s'exécute dans chaque org : faites-la aussi dans l'org uat.",
    stopButton: "Mark as done (Entrée)",
    stopButtonTouch: "Mark as done (toucher)",
    stopDone: "Faite aussi dans l'org uat : la promotion continue",
    promoBanner: "US-058 non validée, US-056 encore en test : la branch uat ne peut pas partir en entier.",
    doorAll: "Tout promouvoir vers la branch preprod",
    doorAllTip: "La promotion ordinaire prend toute la branch uat : US-056 et US-058 partiraient aussi, et personne ne les a validées.",
    doorBranch: "Créer une branch de promotion : US-014, US-059, US-062",
    doorWait: "Attendre que toutes les stories soient approuvées",
    doorWaitTip: "Le testeur de US-058 est en arrêt maladie et la release est jeudi : l'équipe commerciale a promis à Acme Corp de voir son niveau client vendredi.",
    doorAll_s: "Tout promouvoir",
    doorBranch_s: "Branch de promotion",
    doorWait_s: "Attendre",
    notApproved: "{{id}} n'est pas approuvée : elle reste dans la branch uat",
    notApprovedTip: "Seules les stories approuvées vont dans la branch de promotion. Les autres attendent la suivante dans la branch uat.",
    carried: "{{id}} sur la branch de promotion",
    pickLine: "Ma US-059 a été écrite par-dessus la US-058 de Romain. La US-058 n'est pas approuvée : le cherry-pick de US-059 va être en conflit.",
    doorKeep: "Garder seulement les changements de US-059",
    doorTake: "Garder aussi les changements de US-058",
    doorTakeTip: "La US-058 n'est pas approuvée : elle entrerait dans la release, et son nouveau champ n'existe pas dans l'org preprod, donc le déploiement échoue.",
    doorDrop: "Laisser US-059 hors de la promotion",
    doorDropTip: "La US-059 est approuvée : l'écarter fait mentir la promotion sur la semaine. Le conflit veut juste dire que git est exact : gardez les lignes qui appartiennent à US-059.",
    doorKeep_s: "Seulement US-059",
    doorTake_s: "US-058 aussi",
    doorDrop_s: "Écarter US-059",
    mariiaSquash: "GitHub retient la dernière méthode de merge. Regardez la flèche avant de cliquer.",
    romainErp: "package-no-overwrite : présent veut dire protégé. L'org uat continue d'appeler erp-test.example.com, jamais l'ERP de production.",
    bossLine: "US-014 et US-059 sont validées. US-062 et US-058 n'ont jamais été testées dans l'org uat : voici leurs testeurs.",
    mariiaSick: "Arrêt maladie jusqu'à la semaine prochaine : US-058 ne sera pas validée avant jeudi. La branch uat ne peut pas partir telle quelle vers la branch preprod.",
    b1Name: "Admin, testeur de US-062",
    b2Name: "Admin, testeur de US-058",
    bossTests: "Tests dans l'org uat : {{n}} / {{total}}",
    b1Hello: "Tester US-062 ? Pas le temps, j'ai des réunions toute la journée !",
    b1Half: "Aïe ! D'accord, d'accord, je me connecte à l'org uat...",
    b1Done: "Testée : US-062 fait ce que j'ai demandé. Validée !",
    b2Hello: "US-058 ? Je la teste la semaine prochaine. Ou celle d'après.",
    b2Half: "Arrêtez ! J'ai... un peu de fièvre.",
    b2Escape: "Kof, kof... Je ne me sens pas bien. Absent du bureau : arrêt maladie !",
    testStep: "Test {{n}} / {{total}} fait",
    validatedSign: "US-062 validée",
    us062Validated: "US-062 validée dans l'org uat",
    sickSign: "Absent : arrêt maladie",
    us058Left: "US-058 non validée : son testeur est en arrêt maladie",
    retryHint: "Réessayer reprend aux admins.",
    retryBoss: "Retour aux admins, avec vos Promotion Notes",
    storiesLine: "US-018 et US-052 sont parties vers la branch preprod lundi. Des cinq qui restent, US-014, US-059 et US-062 sont approuvées : US-056 est encore en test, et US-058 attend son testeur, en arrêt maladie.",
    arrived: "L'org preprod est prête pour jeudi : les stories approuvées, et des notes qui disent pourquoi.",
    shortNotes: "Notes de release maigres : récupérez les Pull Requests et les tickets",
    shortNotesInfo: "Les Promotion Notes listaient {{n}} Pull Requests et tickets sur 20 ou plus. Un release manager les lit avant chaque promotion : ce qui y manque, personne ne le vérifie.",
    missedStories: "La branch de promotion a pris {{n}} des 3 stories approuvées : les autres attendent la prochaine promotion dans la branch uat, et la release du jeudi s'en passe."
  }
};

/** The strings taken word for word from the labs, checked by scripts/verify/check-easter-egg.mjs. */
export const QUOTES = [
  { lab: "3.5", text: "Squash and merge" },
  { lab: "3.5", text: "Preview Upcoming Promotion Notes" },
  { lab: "3.10", text: "Create a merge commit" }
];

export function createWorld(ctx) {
  const { t, hud, THREE } = ctx;
  // Two different admins at each play, neither of the last play
  pickAdmins(7, ctx.random, 2).forEach((n, i) => {
    ADMINS[i].face = "boss-" + n + ".svg";
  });
  const verdict = ctx.judgePlan();
  let finished = false;
  let prs = 0;
  let tickets = 0;
  let notesCheered = false;
  const carried = [];
  // What the goal line is about: notes, a door, the manual stop, the stories
  let nearGate = null;
  let stoppedNow = false;

  // Out of hearts at the admins a moment ago: this try starts at them, with the notes collected
  const retry = !ctx.params.startAt && bossRetry && Date.now() - bossRetry.at < BOSS_RETRY_MS ? bossRetry : null;
  bossRetry = null;
  if (retry) {
    prs = retry.prs;
    tickets = retry.tickets;
    notesCheered = prs + tickets >= NOTES_FULL;
  }

  const ob = (move, key, theme, detail) => ({ move, title: "o_" + key, tip: "o_" + key + "_tip", short: "o_" + key + "_s", theme: theme || "error", detail });
  const storyItem = (id) =>
    APPROVED.includes(id)
      ? { glyph: "check", color: "#2E844A", label: STORY_LABELS[id], signGlyph: "check", points: 0, big: true }
      : { glyph: "lock", color: "#706E6B", label: STORY_LABELS[id], signGlyph: "lock", points: 0, bad: true };

  const config = {
    sections: [
      { name: t("s0"), color: 0x9050e9, length: UAT_LENGTH, speed: 11, obstacles: ["erp", "token"], items: ["pr", "ticket"], powers: ["shield", "retry"], doubles: 0.25 },
      { name: t("s1"), color: 0xdd7a01, length: PREPROD_LENGTH, speed: 12.5, obstacles: ["markers", "token", "erp"], items: ["pr", "ticket"], powers: ["shield", "retry"], doubles: 0.35 }
    ],
    spacing: [11, 18],
    clear: [BOSS_CLEAR],
    startAt: retry ? BOSS_AT - BOSS_RETRY_RUNUP : 0,
    obstacles: {
      erp: ob("lane", "erp", "warning", "erp-test.example.com"),
      token: ob("duck", "token", "warning", "0 Pull Requests"),
      markers: ob("lane", "markers", "error", "<<<<<<< HEAD"),
      lateuat: ob("lane", "lateuat", "warning", "manual"),
      // What the testers throw back
      untested: Object.assign(ob("lane", "untested", "warning"), { boss: true }),
      machine: Object.assign(ob("jump", "machine", "error"), { boss: true })
    },
    items: {
      pr: { glyph: "branch", color: "#0176D3", label: t("item_pr"), points: 10, model: "pull-request" },
      ticket: { glyph: "note", color: "#06A59A", label: t("item_ticket"), points: 10, model: "ticket" },
      us014: storyItem("us014"),
      us056: storyItem("us056"),
      us058: storyItem("us058"),
      us059: storyItem("us059"),
      us062: storyItem("us062"),
      note: { glyph: "note", color: "#F2C94C", label: "?", points: 0, model: "note", glow: 0xffd84d, glowIntensity: 0.8 }
    },
    powers: {
      shield: { glyph: "shield", color: "#032D60", label: "no-overwrite", short: "p_shield_s", effect: "shield", seconds: 6, toast: "p_shield" },
      preview: { glyph: "eye", color: "#9050E9", label: "Preview", short: "p_preview_s", effect: "custom" },
      retry: { glyph: "loop", color: "#2E844A", label: "Re-run all jobs", short: "p_retry_s", model: "ci-runner", glow: 0x2e844a, effect: "attempt", toast: "p_retry" }
    },
    gates(index) {
      if (index === 0) {
        if (!promoSpec) {
          promoSpec = quiz(t("promoQ"), t("s1"), [
            { text: t("doorBranch"), short: t("doorBranch_s"), ok: true },
            { text: t("doorAll"), short: t("doorAll_s"), tip: t("doorAllTip") },
            { text: t("doorWait"), short: t("doorWait_s"), tip: t("doorWaitTip") }
          ]);
          promoSpec.coach = t("coachPromo");
        }
        return promoSpec;
      }
      return null;
    },
    script: [
      { at: 10, mergeDoors: true },
      { at: 120, manual: true },
      // Right after the manual stop, so its pull still finds the notes before the admins
      { at: 130, preview: true },
      { at: BOSS_AT, bosses: true },
      { at: STORIES_AT, stories: true },
      { at: UAT_LENGTH + 230, cherryPick: true },
      { at: UAT_LENGTH + 300, note: true }
    ]
  };
  // The vegetables thrown at the testers: picked up from the track like any item
  for (const name of VEGETABLES) {
    config.items["veg-" + name] = { glyph: "star", color: "#" + VEGETABLE_COLORS[name].toString(16).padStart(6, "0"), label: "", points: 0, model: name, instanced: true, glowIntensity: 0.35, vegetable: name };
  }
  // The runner asks for the gate again each time it lays a row: build it once
  let promoSpec = null;

  function quiz(question, sign, answers) {
    const lanes = [0, 1, 2].sort(() => ctx.random() - 0.5);
    const doors = [];
    answers.forEach((answer, i) => {
      doors[lanes[i]] = Object.assign({ look: "quiz", ok: Boolean(answer.ok) }, answer);
    });
    return { doors, question, sign, quiz: true };
  }

  const runner = createRunner(ctx, config);

  /* ---------- The release notes counter, under the top bar ---------- */

  const counter = document.createElement("div");
  counter.className = "gr-w7-notes";
  const counterText = document.createElement("span");
  const bar = document.createElement("i");
  const fill = document.createElement("b");
  bar.appendChild(fill);
  counter.append(counterText, bar);
  hud.extra.appendChild(counter);
  function renderNotes() {
    const n = prs + tickets;
    counterText.textContent = t("notes", { prs, tickets });
    fill.style.width = Math.min(100, (n / NOTES_FULL) * 100) + "%";
    counter.classList.toggle("is-full", n >= NOTES_FULL);
    ctx.setData("notes", n);
    ctx.setData("carried", carried.length);
  }
  renderNotes();

  /** The goal line: always the next thing to do. */
  function updateGoal() {
    if (finished) {
      hud.goal("");
      return;
    }
    if (fight.on) {
      hud.goal(fightGoal());
      return;
    }
    if (stoppedNow) {
      hud.goal(t(hud.touch ? "goalStopTouch" : "goalStop"));
      return;
    }
    if (nearGate) {
      hud.goal(t("goalDoor"));
      return;
    }
    const d = runner.distance;
    if (d >= STORIES_AT && d < STORIES_END) {
      hud.goal(t("goalStories", { n: carried.length }));
      return;
    }
    const n = prs + tickets;
    if (d < STORIES_AT) {
      hud.goal(n >= NOTES_FULL ? t("goalNotesFull") : t("goalNotes", { n }));
      return;
    }
    hud.goal(t("goalEnd"));
  }

  /* ---------- The story wagons behind the guinea pig ---------- */

  // Each approved story carried is a small green wagon that follows the
  // guinea pig, each one following the one before
  const wagonBody = ctx.paint.geometry("w7-wagon", () => new THREE.BoxGeometry(0.5, 0.3, 0.5));
  const wagonMaterial = ctx.paint.plain(0x2e844a, { roughness: 0.4, emissive: 0x0d3a1c, emissiveIntensity: 0.4 });
  const wagons = [];

  function addWagon(id) {
    const group = new THREE.Group();
    // A ticket stub on the promotion branch when the salesforce pack is there, a green box otherwise
    const crate = runner.model("ticket", { h: 0.5, turn: Math.PI });
    const body = crate || new THREE.Mesh(wagonBody, wagonMaterial);
    body.position.y = crate ? 0 : 0.2;
    group.add(body);
    const sign = ctx.paint.sign("wagon", STORY_LABELS[id], { color: "#2E844A", glyph: "check", height: 0.24 });
    sign.position.y = 0.7;
    group.add(sign);
    const pig = ctx.pig.object.position;
    group.position.set(pig.x, 0, 1.25 + 0.85 * wagons.length);
    ctx.root.add(group);
    wagons.push(group);
    ctx.fx.burst(pig.x, 0.8, group.position.z, { count: 24, colors: [0x2e844a, 0x45c65a, 0xffb400], speed: 3, up: 4 });
  }

  function moveWagons(dt, time) {
    let leadX = ctx.pig.object.position.x;
    const ease = Math.min(1, dt * 9);
    wagons.forEach((wagon, i) => {
      wagon.position.x += (leadX - wagon.position.x) * ease;
      wagon.position.y = Math.abs(Math.sin(time * 9 + i)) * 0.05;
      leadX = wagon.position.x;
    });
  }

  /* ---------- The testers of the uat org: the bosses ---------- */

  // Textures and materials made here, freed by dispose (the painter frees its own)
  const owned = [];
  let disposed = false;
  const faceUrl = (file) => new URL("../../../images/bosses/" + file, import.meta.url).href;
  const shadows = Boolean(ctx.engine.settings && ctx.engine.settings.shadows);

  /** The portrait on a disc, from its SVG; a white disc until it has loaded. */
  function faceMaterial(file) {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const c = canvas.getContext("2d");
    c.fillStyle = "#ffffff";
    c.beginPath();
    c.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
    c.fill();
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    const material = new THREE.MeshBasicMaterial({ map: texture, alphaTest: 0.5, toneMapped: false });
    owned.push(texture, material);
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      if (disposed) {
        return;
      }
      // A white ring around the face, as on the cards
      c.save();
      c.beginPath();
      c.arc(size / 2, size / 2, size / 2 - 14, 0, Math.PI * 2);
      c.clip();
      c.drawImage(image, 12, 12, size - 24, size - 24);
      c.restore();
      texture.needsUpdate = true;
    };
    image.onerror = () => {};
    image.src = faceUrl(file);
    return material;
  }

  /** An admin: legs, a shirt, arms, and the big round portrait for a head. */
  function buildAdmin(spec) {
    const group = new THREE.Group();
    group.scale.setScalar(ADMIN_SCALE);
    group.visible = false;
    ctx.root.add(group);
    const limb = ctx.paint.geometry("w7-limb", () => new THREE.CapsuleGeometry(0.13, 0.62, 4, 10).translate(0, -0.42, 0));
    const torso = ctx.paint.geometry("w7-torso", () => new THREE.CapsuleGeometry(0.46, 0.55, 6, 14));
    const disc = ctx.paint.geometry("w7-face", () => new THREE.CircleGeometry(FACE_R, 40));
    const trousers = ctx.paint.plain(0x22325a, { roughness: 0.7 });
    const shirt = ctx.paint.plain(spec.shirt, { roughness: 0.6 });
    const part = (geometry, material, x, y, z) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = shadows;
      group.add(mesh);
      return mesh;
    };
    const legs = [-0.2, 0.2].map((x) => {
      const leg = part(limb, trousers, x, 0.92, 0);
      leg.scale.set(1.25, 1.1, 1.25);
      return leg;
    });
    const body = part(torso, shirt, 0, 1.6, 0);
    body.scale.set(1.1, 1, 0.75);
    const left = part(limb, shirt, -0.6, 2.05, 0);
    left.rotation.z = -0.25;
    const right = part(limb, shirt, 0.6, 2.05, 0);
    const faceMat = faceMaterial(spec.face);
    const face = part(disc, faceMat, 0, FACE_Y, 0.4);
    face.castShadow = false;
    face.renderOrder = 1;
    // A thermometer, for the one who leaves on sick leave
    const thermometer = new THREE.Group();
    const stick = new THREE.Mesh(
      ctx.paint.geometry("w7-thermo", () => new THREE.CylinderGeometry(0.07, 0.07, 1.0, 10).translate(0, 0.5, 0)),
      ctx.paint.plain(0x9fd3ff, { roughness: 0.25, emissive: 0x1b5f99, emissiveIntensity: 0.35 })
    );
    const bulb = new THREE.Mesh(
      ctx.paint.geometry("w7-thermo-bulb", () => new THREE.SphereGeometry(0.13, 12, 8)),
      ctx.paint.plain(0xea001e, { emissive: 0x8a0010, emissiveIntensity: 0.6 })
    );
    bulb.position.y = 1.0;
    thermometer.add(stick, bulb);
    // Out of the corner of his mouth, the red end outside
    thermometer.position.set(0.08, FACE_Y - 0.3, 0.48);
    thermometer.rotation.set(0.35, 0, -1.85);
    thermometer.visible = false;
    group.add(thermometer);
    const name = ctx.paint.sign("w7-admin", t(spec.name), { color: "#0176D3", glyph: "profile", height: 0.34 });
    name.position.y = FACE_Y + FACE_R + 0.32;
    group.add(name);
    const validated = ctx.paint.sign("w7-validated", t("validatedSign"), { color: "#2E844A", glyph: "check", height: 0.5 });
    validated.position.y = FACE_Y + FACE_R + 0.4;
    validated.visible = false;
    group.add(validated);
    const sick = ctx.paint.sign("w7-sick", t("sickSign"), { color: "#DD7A01", glyph: "warning", height: 0.5 });
    sick.position.y = FACE_Y + FACE_R + 0.4;
    sick.visible = false;
    group.add(sick);
    return { group, legs, left, right, face, faceMat, thermometer, name, validated, sick };
  }

  const admins = ADMINS.map(buildAdmin);

  // The warning on the track in the lane of a throw, from the admin to the guinea pig
  const stripeGeometry = ctx.paint.geometry("w7-stripe", () => new THREE.PlaneGeometry(1.8, 1).rotateX(-Math.PI / 2).translate(0, 0, -0.5));
  const stripeLook = {
    untested: new THREE.MeshBasicMaterial({ color: 0xdd7a01, transparent: true, opacity: 0.42, depthWrite: false, toneMapped: false }),
    machine: new THREE.MeshBasicMaterial({ color: 0xea001e, transparent: true, opacity: 0.42, depthWrite: false, toneMapped: false })
  };
  owned.push(stripeLook.untested, stripeLook.machine);
  const stripes = [0, 1, 2, 3].map(() => {
    const mesh = new THREE.Mesh(stripeGeometry, stripeLook.untested);
    mesh.position.y = 0.03;
    mesh.renderOrder = 1;
    mesh.visible = false;
    ctx.root.add(mesh);
    return { mesh, used: false };
  });

  function takeStripe(kind, lane) {
    const stripe = stripes.find((s) => !s.used);
    if (!stripe) {
      return null;
    }
    stripe.used = true;
    stripe.mesh.material = stripeLook[kind];
    stripe.mesh.position.x = runner.LANES[lane];
    stripe.mesh.scale.z = -ADMIN_Z;
    stripe.mesh.visible = true;
    return stripe;
  }

  function dropStripe(stripe) {
    if (stripe) {
      stripe.used = false;
      stripe.mesh.visible = false;
    }
  }

  // The vegetables on their way to the admin's face: a few copies of each, made once
  const flights = [];
  const flightBall = ctx.paint.geometry("w7-veg-ball", () => new THREE.SphereGeometry(0.22, 12, 8));
  function takeFlight(name) {
    let flight = flights.find((f) => !f.live && f.name === name);
    if (!flight) {
      const copy = ctx.models ? ctx.models.get(name, { height: 0.6, shadows: false }) : null;
      const mesh = copy || new THREE.Mesh(flightBall, ctx.paint.plain(VEGETABLE_COLORS[name]));
      ctx.root.add(mesh);
      flight = { mesh, name, live: false, t: 0, x0: 0, y0: 0 };
      flights.push(flight);
    }
    return flight;
  }

  const fight = {
    on: false,
    phase: "",
    index: 0,
    time: 0,
    done: 0,
    x: 0,
    goalLane: 1,
    move: 0,
    next: 0,
    windup: 0,
    targets: [],
    vegNext: 0,
    sinceCatch: 0,
    flinch: 0,
    swing: 0,
    said: "",
    step: 0,
    clock: 0,
    ease: 1,
    over: false
  };
  // The throws on the track, and the vegetables falling or lying on it
  const shots = [];
  const greens = [];

  /* The panel of the tester: his face, his name, his tests, what he says */
  const bossPanel = document.createElement("div");
  bossPanel.className = "gr-w7-boss";
  bossPanel.hidden = true;
  const bossFace = document.createElement("img");
  bossFace.alt = "";
  bossFace.decoding = "async";
  const bossMain = document.createElement("div");
  const bossName = document.createElement("strong");
  const bossBar = document.createElement("i");
  const bossFill = document.createElement("b");
  bossBar.appendChild(bossFill);
  const bossCount = document.createElement("span");
  const bossSay = document.createElement("q");
  bossMain.append(bossName, bossBar, bossCount, bossSay);
  bossPanel.append(bossFace, bossMain);
  hud.extra.appendChild(bossPanel);

  function renderBoss() {
    const spec = ADMINS[fight.index];
    bossName.textContent = t(spec.name);
    bossCount.textContent = t("bossTests", { n: fight.done, total: spec.tests });
    bossFill.style.width = Math.min(100, (fight.done / spec.tests) * 100) + "%";
    bossSay.textContent = fight.said ? t(fight.said) : "";
    bossSay.hidden = !fight.said;
    bossPanel.classList.toggle("is-done", fight.phase === "beaten" || fight.phase === "leave");
    bossPanel.classList.toggle("is-sick", fight.phase === "escape");
    ctx.setData("boss", fight.on ? fight.index + 1 : 0);
    ctx.setData("boss-tests", fight.done);
    ctx.setData("fight", fight.phase || "off");
  }

  function say(key) {
    fight.said = key;
    renderBoss();
  }

  function fightGoal() {
    const spec = ADMINS[fight.index];
    if (fight.phase === "beaten" || fight.phase === "leave") {
      return t("us062Validated");
    }
    if (fight.phase === "escape") {
      return t("goalSick");
    }
    return t(spec.goal, { n: fight.done, total: spec.tests });
  }

  /** The track holds: the two testers, one after the other. */
  function startBosses() {
    if (fight.on || fight.over) {
      return;
    }
    fight.on = true;
    runner.hold(true);
    runner.setSpeedFactor(FIGHT_SPEED);
    counter.hidden = true;
    bossPanel.hidden = false;
    hud.chat("mariia", t("bossLine"), 6000);
    enterAdmin(0);
  }

  function enterAdmin(index) {
    fight.index = index;
    fight.phase = "enter";
    fight.time = 0;
    fight.done = 0;
    fight.windup = 0;
    fight.targets = [];
    fight.x = runner.LANES[1];
    fight.goalLane = 1;
    fight.sinceCatch = 0;
    const admin = admins[index];
    admin.group.visible = true;
    admin.group.position.set(fight.x, 0, ADMIN_Z - 34);
    admin.group.rotation.set(0, 0, 0);
    bossFace.src = faceUrl(ADMINS[index].face);
    ctx.sound.play("power");
    say(ADMINS[index].hello);
    // Said while he runs in, so the box in the middle is gone when he throws
    runner.coach(t(index === 0 ? "coachVeg" : "coachBoss2"), index === 0 ? 3000 : 1600, true);
    updateGoal();
  }

  function fightStep(dt, time) {
    const spec = ADMINS[fight.index];
    const admin = admins[fight.index];
    fight.time += dt;
    fight.clock += dt;
    fight.sinceCatch += dt;
    const g = admin.group;
    switch (fight.phase) {
      case "enter": {
        // He runs in from far down the track
        const u = Math.min(1, fight.time / 1.4);
        g.position.z = ADMIN_Z - 34 * (1 - u) * (1 - u);
        if (u >= 1) {
          fight.phase = "fight";
          ctx.bossStarted();
          fight.time = 0;
          fight.next = 0.8;
          fight.vegNext = 0.4;
          renderBoss();
        }
        break;
      }
      case "fight":
        fightTurn(spec, dt);
        break;
      case "beaten":
        if (fight.time > 2.6) {
          fight.phase = "leave";
          fight.time = 0;
          renderBoss();
        }
        break;
      case "leave": {
        // Off the track to the right, his job done, then the next one comes at once
        const u = Math.min(1, fight.time / 1.3);
        fight.x += (8 - fight.x) * Math.min(1, dt * 3);
        g.position.y = u > 0.5 ? -9 * (u - 0.5) * (u - 0.5) * 4 : 0;
        if (u >= 1) {
          g.visible = false;
          enterAdmin(1);
        }
        break;
      }
      case "escape":
        escapeStep(admin, dt);
        break;
      default:
        break;
    }
    g.position.x = fight.x;
    poseAdmin(admin, dt, time);
    moveShots(dt);
    moveGreens(dt);
    moveFlights(dt);
  }

  /** One frame of the fight: he strafes, winds up, throws; vegetables fall. */
  function fightTurn(spec, dt) {
    if (fight.windup > 0) {
      fight.windup -= dt;
      if (fight.windup <= 0) {
        release();
      }
    } else {
      fight.next -= dt;
      fight.move -= dt;
      if (fight.move <= 0) {
        fight.goalLane = Math.floor(ctx.random() * 3);
        fight.move = 1 + ctx.random() * 0.8;
      }
      // Never a throw while three doors are on the screen
      if (fight.next <= 0 && !runner.choosing) {
        windUp(spec);
      }
    }
    if (fight.windup <= 0) {
      const target = runner.LANES[fight.goalLane];
      const step = 4.5 * dt;
      fight.x += Math.max(-step, Math.min(step, target - fight.x));
    }
    fight.vegNext -= dt;
    if (fight.vegNext <= 0) {
      fight.vegNext = dropVegetable() ? spec.veg : 0.3;
    }
  }

  /** The warning: his arm goes up, the lane of the throw turns red on the track. */
  function windUp(spec) {
    const first = runner.lane;
    const targets = [{ lane: first, kind: ctx.random() < 0.55 ? "untested" : "machine" }];
    if (ctx.random() < spec.double) {
      // Two lanes at most: one is always free
      const others = [0, 1, 2].filter((lane) => lane !== first);
      targets.push({ lane: others[Math.floor(ctx.random() * 2)], kind: ctx.random() < 0.5 ? "untested" : "machine" });
    }
    for (const target of targets) {
      target.stripe = takeStripe(target.kind, target.lane);
    }
    fight.targets = targets;
    fight.windup = spec.windup * fight.ease;
    fight.next = spec.every * fight.ease;
  }

  function release() {
    for (const target of fight.targets) {
      const object = runner.spawnObstacle(target.kind, target.lane, runner.distance - ADMIN_Z - 0.8);
      if (!object) {
        dropStripe(target.stripe);
        continue;
      }
      object.mesh.scale.setScalar(0.45);
      shots.push({ object, t: 0, fromX: fight.x + HAND_X, stripe: target.stripe });
    }
    fight.targets = [];
    fight.swing = 0.35;
    ctx.sound.play("throw");
  }

  /** A vegetable falls on a lane where nothing is coming. False when every lane is busy. */
  function dropVegetable() {
    const busy = new Set(fight.targets.map((target) => target.lane));
    for (const shot of shots) {
      const dz = shot.object.at - runner.distance;
      if (dz > VEG_DROP_Z - 7 && dz < VEG_DROP_Z + 6) {
        busy.add(shot.object.lane);
      }
    }
    const free = [0, 1, 2].filter((lane) => !busy.has(lane));
    if (!free.length) {
      return false;
    }
    // A while without a catch: it falls right in the guinea pig's lane
    const lane = fight.sinceCatch > 5 && free.includes(runner.lane) ? runner.lane : free[Math.floor(ctx.random() * free.length)];
    const name = VEGETABLES[Math.floor(ctx.random() * VEGETABLES.length)];
    const object = runner.spawnItem("veg-" + name, lane, runner.distance + VEG_DROP_Z, VEG_DROP_Y);
    if (object) {
      greens.push({ object, vy: 0, landed: false });
    }
    return true;
  }

  /** What lies on the track comes towards the guinea pig at the pace of the scenery. */
  function moveShots(dt) {
    const v = runner.speed;
    for (let i = shots.length - 1; i >= 0; i--) {
      const shot = shots[i];
      const o = shot.object;
      if (o.removed) {
        dropStripe(shot.stripe);
        shots.splice(i, 1);
        continue;
      }
      o.at -= v * dt;
      shot.t += dt;
      const u = Math.min(1, shot.t / FLIGHT);
      o.mesh.position.x = shot.fromX + (o.x - shot.fromX) * u;
      o.mesh.position.y = (1 - u) * HAND_Y + 4 * u * (1 - u) * 0.6;
      o.mesh.scale.setScalar(0.45 + 0.55 * u);
      const dz = o.at - runner.distance;
      if (shot.stripe) {
        if (dz < 0.4) {
          dropStripe(shot.stripe);
          shot.stripe = null;
        } else {
          shot.stripe.mesh.scale.z = dz;
        }
      }
    }
  }

  function moveGreens(dt) {
    const v = runner.speed;
    for (let i = greens.length - 1; i >= 0; i--) {
      const green = greens[i];
      const o = green.object;
      if (o.removed || o.done) {
        greens.splice(i, 1);
        continue;
      }
      o.at -= v * dt;
      if (!green.landed) {
        green.vy -= 20 * dt;
        o.y = Math.max(0.85, o.y + green.vy * dt);
        if (o.y <= 0.85) {
          green.landed = true;
          ctx.fx.burst(o.x, 0.4, -(o.at - runner.distance), { count: 8, colors: [0xffffff, 0x7bc96f], speed: 2, up: 2, life: 0.5 });
        }
      }
    }
  }

  /** Caught: the guinea pig throws it at once, at the admin's face. */
  function throwVegetable(name) {
    const flight = takeFlight(name);
    const pig = ctx.pig.object.position;
    flight.live = true;
    flight.t = 0;
    flight.x0 = pig.x;
    flight.y0 = pig.y + 0.8;
    flight.mesh.visible = true;
    flight.mesh.position.set(pig.x, flight.y0, -0.4);
    ctx.sound.play("throw");
  }

  function moveFlights(dt) {
    for (const flight of flights) {
      if (!flight.live) {
        continue;
      }
      flight.t += dt;
      const u = Math.min(1, flight.t / TO_ADMIN);
      const faceY = FACE_Y * ADMIN_SCALE;
      flight.mesh.position.set(flight.x0 + (fight.x - flight.x0) * u, flight.y0 + (faceY - flight.y0) * u + Math.sin(u * Math.PI) * 1.4, -0.4 + (ADMIN_Z + 0.6 + 0.4) * u);
      flight.mesh.rotation.set(flight.t * 9, flight.t * 7, 0);
      if (u >= 1) {
        flight.live = false;
        flight.mesh.visible = false;
        landVegetable(flight.name);
      }
    }
  }

  /** On his face: one more test done. */
  function landVegetable(name) {
    fight.flinch = 0.35;
    ctx.fx.burst(fight.x, FACE_Y * ADMIN_SCALE, ADMIN_Z + 0.9, { count: 26, colors: [VEGETABLE_COLORS[name] || 0xff8a3d, 0xffffff, 0x45c65a], speed: 4, up: 3, life: 0.8 });
    ctx.sound.play("adminSplat");
    if (fight.phase !== "fight") {
      return;
    }
    const spec = ADMINS[fight.index];
    fight.done += 1;
    ctx.collect(30, t("testStep", { n: fight.done, total: spec.tests }));
    if (fight.done === Math.ceil(spec.tests / 2)) {
      fight.said = spec.half;
    }
    renderBoss();
    if (spec.escapes && fight.done >= spec.tests - 1) {
      startEscape();
    } else if (!spec.escapes && fight.done >= spec.tests) {
      beatAdmin();
    }
    updateGoal();
  }

  /** Nothing more comes at the guinea pig: the throws and the vegetables go. */
  function clearTrack() {
    for (const target of fight.targets) {
      dropStripe(target.stripe);
    }
    fight.targets = [];
    fight.windup = 0;
    for (const list of [shots, greens]) {
      for (const entry of list) {
        const o = entry.object;
        if (!o.removed && !o.done) {
          ctx.fx.burst(o.mesh.position.x, 0.8, o.mesh.position.z, { count: 10, colors: [0xffffff, 0xc9c9c9], speed: 2, up: 2, life: 0.5 });
        }
        o.done = true;
        o.mesh.visible = false;
        // Behind the guinea pig: the runner takes it away
        o.at = runner.distance - 20;
        if (entry.stripe) {
          dropStripe(entry.stripe);
        }
      }
      list.length = 0;
    }
  }

  /** US-062: tested, validated in the uat org. */
  function beatAdmin() {
    const admin = admins[0];
    fight.phase = "beaten";
    fight.time = 0;
    clearTrack();
    say("b1Done");
    admin.name.visible = false;
    admin.validated.visible = true;
    ctx.fx.burst(fight.x, 4, ADMIN_Z + 1, { count: 70, colors: [0x2e844a, 0x45c65a, 0xffb400, 0xffffff], speed: 6, up: 6, life: 1.4 });
    ctx.sound.play("gate");
    ctx.points(200);
    hud.toast(t("us062Validated"), "good");
    runner.hop();
    // A heart lost on the way: Re-run all jobs comes down the lane, one more attempt for the next tester
    if (ctx.attempts < HEARTS) {
      const power = runner.spawnPower("retry", runner.lane, runner.distance + 12);
      if (power) {
        greens.push({ object: power, vy: 0, landed: true });
      }
    }
    updateGoal();
  }

  /** US-058: he coughs, a thermometer, out of office, and off the track. */
  function startEscape() {
    fight.phase = "escape";
    fight.time = 0;
    fight.step = 0;
    clearTrack();
    say("b2Escape");
    ctx.sound.play("adminCough");
    updateGoal();
  }

  function escapeStep(admin, dt) {
    const time = fight.time;
    if (fight.step === 0 && time > 0.5) {
      fight.step = 1;
      admin.thermometer.visible = true;
      // A little green in the face
      admin.faceMat.color.setHex(0xd2f5c4);
    }
    if (fight.step === 1 && time > 1.0) {
      fight.step = 2;
      ctx.sound.play("adminCough");
      admin.name.visible = false;
      admin.sick.visible = true;
      hud.toast(t("us058Left"), "bad");
    }
    if (time > 1.9) {
      // He runs off the side of the track, and drops into the clouds
      const u = Math.min(1, (time - 1.9) / 1.6);
      fight.x += (-9 - fight.x) * Math.min(1, dt * 2.6);
      // Turned to run, still showing his face
      admin.group.rotation.y = -0.8;
      admin.group.position.y = fight.x < -4.2 ? -10 * u * u : Math.abs(Math.sin(time * 12)) * 0.35;
      if (u >= 1) {
        endBosses();
      }
    }
  }

  /** Back to the run: the promotion question is next. */
  function endBosses() {
    ctx.bossBeaten();
    clearTrack();
    for (const admin of admins) {
      admin.group.visible = false;
    }
    fight.on = false;
    fight.over = true;
    fight.phase = "";
    runner.hold(false);
    runner.setSpeedFactor(1);
    // How long both testers took, in game time, for the checks
    ctx.setData("fight-seconds", fight.clock.toFixed(1));
    bossPanel.hidden = true;
    counter.hidden = false;
    renderBoss();
    hud.chat("mariia", t("mariiaSick"), 7000);
    updateGoal();
  }

  /** Running backwards before the guinea pig, the arm that throws, a flinch at each hit. */
  function poseAdmin(admin, dt, time) {
    const running = fight.phase !== "beaten";
    const stride = running ? Math.sin(time * 10) * 0.55 : 0;
    admin.legs[0].rotation.x = stride;
    admin.legs[1].rotation.x = -stride;
    if (fight.phase !== "escape" && fight.phase !== "leave") {
      admin.group.position.y = running ? Math.abs(Math.sin(time * 10)) * 0.06 : 0;
    }
    fight.flinch = Math.max(0, fight.flinch - dt);
    fight.swing = Math.max(0, fight.swing - dt);
    admin.group.rotation.x = -fight.flinch * 0.9;
    admin.face.scale.setScalar(1 + fight.flinch * 0.5);
    // Up and back while he winds up, forward as he throws, then down
    const arm = fight.windup > 0 ? 3.0 : fight.swing > 0 ? -1.3 * (fight.swing / 0.35) : 0;
    admin.right.rotation.x += (arm - admin.right.rotation.x) * Math.min(1, dt * 14);
    admin.right.rotation.z = 0.25;
    admin.left.rotation.x = 0;
    if (fight.phase === "beaten") {
      // Both arms up: validated
      admin.right.rotation.x = Math.PI;
      admin.left.rotation.x = Math.PI;
    }
    const pulse = 0.42 + Math.abs(Math.sin(time * 9)) * 0.25;
    stripeLook.untested.opacity = pulse;
    stripeLook.machine.opacity = pulse;
  }

  /** A hit by a throw: a heart, and on the last one, the next try starts here. */
  function hurt(event) {
    const last = ctx.attempts <= 1;
    runner.setInvulnerable(2);
    runner.player.hit = 0.6;
    runner.mercy();
    runner.shake(0.35);
    runner.breakStreak();
    // A breath after a hit, before the next throw, and slower throws from now on
    fight.next = Math.max(fight.next, 1.6);
    fight.ease = Math.min(EASE_MAX, fight.ease + EASE_PER_HIT);
    ctx.loseAttempt(t(event.def.title), t(event.def.tip) + (last ? " " + t("retryHint") : ""));
    if (!ctx.playing) {
      bossRetry = { at: Date.now(), prs, tickets };
    }
  }

  function onScript(step) {
    const ahead = 70;
    if (step.mergeDoors) {
      hud.chat("mariia", t("mariiaSquash"), 5000);
      const spec = quiz(t("mergeQ"), t("s0"), [
        { text: t("doorMergeCommit"), short: t("doorMergeCommit_s"), ok: true, mergeCommit: true },
        { text: t("doorSquash"), short: t("doorSquash_s"), tip: t("squashTip"), squash: true },
        { text: t("doorRebase"), short: t("doorRebase_s"), tip: t("squashTip"), squash: true }
      ]);
      runner.spawnGate(spec, step.at + ahead + 20);
    }
    if (step.manual) {
      // The manual action runs once in every org: uat too
      if (verdict.deliverability.ok) {
        runner.spawnStop({ header: t("stopHeader"), title: t("stopTitle"), hint: t("stopHint"), button: t(hud.touch ? "stopButtonTouch" : "stopButton") }, step.at + ahead);
      } else {
        runner.spawnObstacle("lateuat", 1, step.at + ahead);
      }
      hud.chat("romain", t("romainErp"), 5000);
    }
    if (step.preview) {
      runner.spawnPower("preview", Math.floor(ctx.random() * 3), step.at + ahead);
    }
    if (step.bosses) {
      startBosses();
    }
    if (step.stories) {
      // The five stories of uat come down the track: carry only the approved ones
      const order = APPROVED.concat(NOT_APPROVED).sort(() => ctx.random() - 0.5);
      order.forEach((id, i) => {
        runner.spawnItem(id, i % 3, step.at + ahead + 20 + i * 22, 0.85);
      });
      hud.chat("mariia", t("storiesLine"), 6000);
      runner.coach(t("coachStories"), 2800, true);
      updateGoal();
    }
    if (step.cherryPick) {
      const spec = quiz(t("pickQ"), "US-059", [
        { text: t("doorKeep"), short: t("doorKeep_s"), ok: true },
        { text: t("doorTake"), short: t("doorTake_s"), tip: t("doorTakeTip") },
        { text: t("doorDrop"), short: t("doorDrop_s"), tip: t("doorDropTip") }
      ]);
      runner.spawnGate(spec, step.at + ahead);
      hud.chat("mariia", t("pickLine"), 6000);
    }
    if (step.note) {
      // Victor's note: high in the air, in the right lane, for a jump
      runner.calm(step.at + ahead);
      runner.spawnItem("note", 2, step.at + ahead, 1.7, { label: false });
    }
  }

  function onEvent(event) {
    switch (event.type) {
      case "script":
        onScript(event.step);
        return;
      case "section":
        updateGoal();
        return;
      case "gateNear":
        nearGate = event.gate;
        updateGoal();
        return;
      case "stop":
        ctx.sound.play("gate");
        stoppedNow = true;
        updateGoal();
        return;
      case "hit":
        if (event.def.boss) {
          hurt(event);
          return;
        }
        runner.handle(event);
        return;
      case "item":
        if (event.def.vegetable) {
          fight.sinceCatch = 0;
          ctx.points(10);
          throwVegetable(event.def.vegetable);
          return;
        }
        if (event.kind === "note") {
          ctx.foundNote();
          return;
        }
        if (event.kind === "pr" || event.kind === "ticket") {
          if (event.kind === "pr") {
            prs = Math.min(prs + 1, 22);
          } else {
            tickets = Math.min(tickets + 1, 17);
          }
          renderNotes();
          runner.handle(event);
          if (prs + tickets >= NOTES_FULL && !notesCheered) {
            notesCheered = true;
            ctx.fx.burst(0, 2, -1, { count: 50, speed: 6, up: 6 });
            ctx.sound.play("happy");
            runner.coach(t("coachFull"), 1800, true);
          }
          updateGoal();
          return;
        }
        if (APPROVED.includes(event.kind)) {
          carried.push(event.kind);
          addWagon(event.kind);
          ctx.collect(100, t("carried", { id: STORY_LABELS[event.kind] }));
          runner.hop();
          runner.coach(t("coachWagon", { id: STORY_LABELS[event.kind] }), 1400, true);
          renderNotes();
          updateGoal();
          return;
        }
        if (NOT_APPROVED.includes(event.kind)) {
          runner.breakStreak();
          runner.mercy();
          ctx.loseAttempt(t("notApproved", { id: STORY_LABELS[event.kind] }), t("notApprovedTip"));
          return;
        }
        runner.handle(event);
        return;
      case "power":
        if (event.kind === "preview") {
          ctx.sound.play("power");
          hud.toast(t("p_preview") + ": " + t("notes", { prs: 22, tickets: 17 }), "power");
          runner.magnet(120, ["pr", "ticket"]);
          ctx.fx.burst(event.object.x, 1.2, 0, { count: 30, speed: 4, up: 5 });
          return;
        }
        runner.handle(event);
        return;
      case "gate":
        nearGate = null;
        if (!event.ok && event.door.squash) {
          // Squash takes the history away: the release notes have nothing to read
          prs = 0;
          tickets = 0;
          notesCheered = false;
          renderNotes();
          hud.toast(t("notesEmptied"), "bad");
        }
        runner.handle(event);
        updateGoal();
        return;
      case "end": {
        finished = true;
        hud.goal("");
        const full = prs + tickets;
        hud.toast(full >= NOTES_FULL ? t("arrived") : t("shortNotes"), full >= NOTES_FULL ? "good" : "bad");
        const info = [full >= NOTES_FULL ? "" : t("shortNotesInfo", { n: full }), carried.length < APPROVED.length ? t("missedStories", { n: carried.length }) : ""].filter(Boolean).join(" ");
        // Full notes and every approved story are worth a bonus
        ctx.finish(full * 5 + carried.length * 50, info);
        return;
      }
      default:
        runner.handle(event);
    }
  }

  /* ---------- The world playing itself, for the check ---------- */

  // window.__guineaRun only exists for checks, and so does the track it reads
  let autoplay = false;
  let autoMove = 0;
  if (window.__guineaRun) {
    window.__guineaRun.w7 = {
      autoplay(on) {
        autoplay = on !== false;
      }
    };
  }

  /** One step of a careful player: dodge, take the right door and the green things, mark the manual step. */
  function autoStep(dt) {
    const track = window.__guineaTrack;
    if (!track) {
      return;
    }
    if (runner.stopped) {
      act("confirm");
      return;
    }
    const d = runner.distance;
    const lane = runner.lane;
    // A throw blocks its lane once it lies close on the track: what is in that lane
    // now (a vegetable) comes first, as a player would take it
    const blocked = [false, false, false];
    let door = -1;
    for (const o of track.objects()) {
      if (o.done || o.removed) {
        continue;
      }
      const dz = o.at - d;
      if (o.type === "obstacle" && dz > -0.8 && dz < 8) {
        const move = o.def.move;
        if (move === "lane") {
          blocked[o.lane] = true;
        } else if ((move === "jump" || move === "gap") && o.lane === lane && dz > 0.2 && dz < 2.3) {
          act("jump");
        } else if (move === "duck" && o.lane === lane && dz > 0.1 && dz < 2.4) {
          act("duck");
        }
      } else if (o.type === "item" && o.def.bad && dz > -0.6 && dz < 7) {
        blocked[o.lane] = true;
      } else if (o.type === "gate" && dz > 0 && dz < 70) {
        door = o.spec.doors.findIndex((x) => x.ok);
      }
    }
    let want = door;
    if (want < 0) {
      let nearest = Infinity;
      for (const o of track.objects()) {
        const dz = o.at - d;
        if ((o.type === "item" || o.type === "power") && !o.done && !o.removed && !(o.def && o.def.bad) && dz > 0.4 && dz < 14 && dz < nearest && !blocked[o.lane]) {
          nearest = dz;
          want = o.lane;
        }
      }
    }
    if (want < 0 || blocked[want]) {
      const free = [0, 1, 2].filter((l) => !blocked[l]).sort((a, b) => Math.abs(a - lane) - Math.abs(b - lane));
      want = free.length ? free[0] : lane;
    }
    autoMove -= dt;
    if (want !== lane && autoMove <= 0) {
      const next = want < lane ? lane - 1 : lane + 1;
      if (!blocked[next] || blocked[lane]) {
        act(want < lane ? "left" : "right");
        autoMove = 0.12;
      }
    }
  }

  function act(name) {
    if (runner.action(name) === "release") {
      runner.release();
      stoppedNow = false;
      ctx.collect(150, t("stopDone"));
      runner.hop();
      updateGoal();
    }
  }

  // The goal follows the track: refreshed when the stretch of the stories
  // starts and ends, not every frame
  let stretch = -1;
  let greeted = false;
  renderBoss();

  return {
    start() {
      if (retry) {
        greeted = true;
        hud.toast(t("retryBoss"), "power");
      }
      updateGoal();
    },
    update(dt, time) {
      if (finished) {
        return;
      }
      // The first instruction, once the world is really playing
      if (!greeted) {
        greeted = true;
        runner.coach(t("coachStart"), 2600, true);
      }
      if (autoplay) {
        autoStep(dt);
      }
      if (fight.on) {
        fightStep(dt, time);
      }
      const events = runner.update(dt, time);
      for (const event of events) {
        onEvent(event);
        if (!ctx.playing) {
          return;
        }
      }
      moveWagons(dt, time);
      const d = runner.distance;
      const now = d < STORIES_AT ? 0 : d < STORIES_END ? 1 : 2;
      if (now !== stretch) {
        stretch = now;
        updateGoal();
      }
    },
    action(name) {
      act(name);
    },
    dispose() {
      disposed = true;
      if (window.__guineaRun && window.__guineaRun.w7) {
        delete window.__guineaRun.w7;
      }
      runner.dispose();
      counter.remove();
      bossPanel.remove();
      for (const wagon of wagons) {
        ctx.root.remove(wagon);
      }
      for (const thing of owned) {
        thing.dispose();
      }
      ctx.pig.setRiders([]);
    }
  };
}

export const CSS =
  RUNNER_CSS +
  `
.guinea-run .gr-w7-notes {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 12px;
  border: 2px solid #ffffff;
  border-left: 6px solid #9050e9;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 3px 0 rgba(3, 45, 96, 0.25);
  color: #032d60;
  font-size: 13px;
  font-weight: 700;
  pointer-events: none;
}
.guinea-run .gr-w7-notes i {
  display: block;
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: #e8edf3;
}
.guinea-run .gr-w7-notes b {
  display: block;
  width: 0;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #9050e9, #e3066a);
  transition: width 0.25s;
}
.guinea-run .gr-w7-notes.is-full b {
  background: linear-gradient(90deg, #2e844a, #45c65a);
}
.guinea-run .gr-w7-notes[hidden],
.guinea-run .gr-w7-boss[hidden],
.guinea-run .gr-w7-boss q[hidden] {
  display: none;
}
.guinea-run .gr-w7-boss {
  display: flex;
  gap: 10px;
  align-items: center;
  width: min(430px, calc(100vw - 24px));
  box-sizing: border-box;
  padding: 6px 12px 6px 6px;
  border: 2px solid #ffffff;
  border-left: 6px solid #dd7a01;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 3px 0 rgba(3, 45, 96, 0.25);
  color: #032d60;
  pointer-events: none;
}
.guinea-run .gr-w7-boss img {
  flex: none;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 0 0 3px #dd7a01;
}
.guinea-run .gr-w7-boss > div {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.guinea-run .gr-w7-boss strong {
  font-size: 14px;
  font-weight: 800;
}
.guinea-run .gr-w7-boss i {
  display: block;
  height: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: #e8edf3;
}
.guinea-run .gr-w7-boss b {
  display: block;
  width: 0;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #2e844a, #45c65a);
  transition: width 0.25s;
}
.guinea-run .gr-w7-boss span {
  font-size: 12px;
  font-weight: 700;
}
.guinea-run .gr-w7-boss q {
  display: block;
  margin-top: 2px;
  padding: 4px 8px;
  border-radius: 10px;
  background: #fff4e5;
  color: #3e2b02;
  font-size: 13px;
  font-style: italic;
  font-weight: 700;
  line-height: 1.3;
}
.guinea-run .gr-w7-boss.is-done {
  border-left-color: #2e844a;
}
.guinea-run .gr-w7-boss.is-done img {
  box-shadow: 0 0 0 3px #2e844a;
}
.guinea-run .gr-w7-boss.is-sick img {
  filter: hue-rotate(70deg) saturate(0.75);
}
@media (max-width: 600px) {
  .guinea-run .gr-w7-notes {
    padding: 4px 8px;
    font-size: 11px;
  }
  .guinea-run .gr-w7-boss {
    gap: 8px;
    padding: 4px 8px 4px 4px;
  }
  .guinea-run .gr-w7-boss img {
    width: 56px;
    height: 56px;
  }
  .guinea-run .gr-w7-boss strong {
    font-size: 13px;
  }
  .guinea-run .gr-w7-boss q {
    font-size: 12px;
  }
}
`;
