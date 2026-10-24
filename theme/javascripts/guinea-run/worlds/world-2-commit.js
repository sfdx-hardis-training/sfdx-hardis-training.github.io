/*
 * World 2, Retrieve and commit: a sorting belt. The
 * Metadata Retriever's Recent Changes come down three lanes as crates, every
 * one of them carrying your name, and the guinea pig at the end of the belt
 * jumps to stage the crate of its lane into Staged Changes. A crate let by is
 * a crate left unstaged, which is right for nearly all of them.
 *
 * US-014 is four components: the field, the layout and the two permission
 * sets. Staging anything else costs an attempt, with the reason. A story
 * crate let by comes round again later, for a few points less.
 *
 * The twist: the tick box in the table header, every row at once.
 * The belt floods with eighty crates that stage themselves, and the way out is
 * the real command, Reset selected list of items to merge, riding the belt as a
 * power-up. Like the real one it also undoes what you had staged: your story
 * comes back in front of you, uncommitted, and you stage it again.
 *
 * The boss, once the sorting is done: the "git add ." admin comes out of the
 * Metadata Retriever and throws everything onto your commit, whole Profiles,
 * other people's work and test leftovers, already ticked, faster and faster.
 * The jump flips the tick of the crate in your lane, as before: a jump on what
 * is not US-014 throws it back at him and hits him (his health bar), and your
 * own four files are left to roll into Staged Changes. The first junk of each
 * kind that reaches your commit says why and costs an attempt, never two within
 * a few seconds and at most two in the fight; more of it costs points. Your own
 * file thrown back costs points and heals him a little.
 * He wears one of the twenty-one admin portraits (images/bosses/boss-N.svg), a
 * different one at each play (core/faces.js). guinea-at=1 opens the boss, and a player out of attempts at him
 * tries again from him.
 *
 * Once he gives up: Commit, Save / Publish, its first question, the Git Delta
 * package.xml report, push.
 */
import { SLDS, rounded, font, fitText, glyph } from "../core/painter.js";
import { pickAdmins, adminFaceUrl } from "../core/faces.js";
import { readingMs } from "../hud.js";

export const PADS = ["left", "right", "jump", "confirm"];
/** On a phone, toasts and tips sit above the pads: the track runs up the middle. */
export const PHONE_MESSAGES = "bottom";

export const MODELS = ["salesforce", "office"];

const LANES = [-1.7, 0, 1.7];
const BELT_Y = 0.42;
const SPAWN_Z = -26;
// A crate whose centre passes TIP_Z falls into the trench: left unstaged
const TIP_Z = -1.0;
// A jump stages the crate of its lane while its centre is between these two
const WINDOW_FAR = -4.0;
const PIG_Z = 0.75;
const BASKET_X = 3.5;
const BASKET_Z = 0.45;
const CRATE = { w: 1.45, h: 0.8, d: 0.9 };
const POOL = 60;
const FLOOD = 80;
const JUMP_SPEED = 6.2;
const GRAVITY = 20;
const FLIGHT_S = 0.55;
const SORT_S = 14;
const PILE_MAX = 96;
// The belt speeds up with progress, never with time spent: each US-014 file
// staged or left out, and the reset, is one step of PACE_STEPS. The pace eases
// in from 1 to 1 + PACE_GAIN, and a mistake slows it a notch for a while.
const BASE_SPEED = 2.7;
const PACE_GAIN = 0.38;
const PACE_STEPS = 7;
const MERCY_S = 5;
const MERCY_DROP = 0.15;

// The boss: he stands at the far end of the belt and his crates land in front
// of him, so each one rides a while before it reaches the guinea pig
const BOSS_HP = 20;
const BOSS_Z = -14.6;
const BOSS_SCALE = 1.35;
const BOSS_HEAD = 1.0;
const BOSS_HEAD_Y = 3.2;
const BOSS_ENTER_S = 2.8;
const BOSS_LEAVE_S = 2.2;
const BOSS_BEATEN_S = 3.8;
const LAND_Z = -10.5;
const WINDUP_S = 0.45;
const TOSS_S = 0.7;
const TOSS_ARC = 1.6;
const BACK_S = 0.55;
const BACK_ARC = 2.2;
const HELD_SCALE = 0.75;
// Two or three crates of one throw leave his hands this far apart
const BURST_GAP = 0.36;
// A whole Profile is a bigger crate, and hits him twice as hard
const PROFILE_SIZE = 1.25;
// After junk cost an attempt, more junk in the commit costs points only, for this long
const BOSS_GRACE_S = 6;
// The most attempts junk can cost in one fight: past that, it costs points
const BOSS_LOSSES = 2;
// From full health to none: the time between two throws, and the pace of the belt
const THROW_GAP = [1.6, 0.8];
const BOSS_PACE = [1.1, 1.55];
const ARM_REST = 0.32;
const ARM_UP = 2.5;
// A player out of attempts at the boss tries again from the boss, for a while
const BOSS_RETRY_MS = 15 * 60000;
// What each piece of junk is, for its sign and the reason it is not in your commit
const JUNK_KIND = {
  admin: "profile",
  salesuser: "profile",
  object: "object",
  rating: "theirs",
  channel: "theirs",
  discount: "theirs",
  escalation: "theirs",
  contactlayout: "theirs",
  legacy: "leftover",
  listview: "leftover"
};
const JUNK_GLYPHS = { profile: "profile", object: "box", theirs: "lock", leftover: "warning" };

// The four components of US-014
const STORY = [
  { id: "field", type: "CustomField", name: "Account.Customer_Tier__c", sign: "Customer_Tier__c", min: 7 },
  { id: "layout", type: "Layout", name: "Account-Account Layout", sign: "Account Layout", min: 6 },
  { id: "rep", type: "PermissionSet", name: "Sales_Rep", sign: "Sales Rep", min: 5 },
  { id: "manager", type: "PermissionSet", name: "Sales_Manager", sign: "Sales Manager", min: 5 }
];

// Everything else in Recent Changes under your name: what changed around your
// field without you meaning it to, and what an older deployment or older work
// touched. `min` is a recent change (minutes ago), the others are older.
const NOISE = [
  { id: "admin", type: "Profile", name: "Admin", min: 7, why: "admin" },
  { id: "object", type: "CustomObject", name: "Account", min: 7, why: "object" },
  { id: "listview", type: "ListView", name: "Account.All_Accounts", min: 9, why: "listview" },
  { id: "rating", type: "CustomField", name: "Account.Rating_Score__c", why: "apos" },
  { id: "legacy", type: "CustomField", name: "Account.Legacy_Id__c" },
  { id: "channel", type: "CustomField", name: "Contact.Preferred_Channel__c" },
  { id: "discount", type: "CustomField", name: "Opportunity.Discount__c" },
  { id: "escalation", type: "CustomField", name: "Case.Escalation_Level__c" },
  { id: "contactlayout", type: "Layout", name: "Contact-Contact Layout", why: "eol" },
  { id: "salesuser", type: "Profile", name: "Sales User", why: "admin" }
];

const TYPES = {
  CustomField: { glyph: "log", color: "#06A59A", abbr: "F" },
  Layout: { glyph: "puzzle", color: "#3296ED", abbr: "L" },
  PermissionSet: { glyph: "permset", color: "#DD7A01", abbr: "PS" },
  Profile: { glyph: "profile", color: "#0176D3", abbr: "P" },
  CustomObject: { glyph: "box", color: "#C23934", abbr: "O" },
  ListView: { glyph: "log", color: "#2E844A", abbr: "LV" }
};

export const TEXTS = {
  en: {
    intro: "Recent Changes lists everything in your dev sandbox that carries your name. US-014 is only four of them: the field, the layout and the two permission sets.",
    how1: "Change lane with the left and right arrows, or swipe",
    how2: "Jump with Up or a tap to stage your 4 files",
    how3: "Let everything else go by, then Commit and Save / Publish",
    goalStage: "Stage the 4 files of US-014: {{n}} / 4",
    goalFlood: "Catch Reset, the purple branch",
    goalEnd: "Commit, then Save / Publish",
    coachStart: "Jump when one of your 4 files reaches you!",
    coachNoise: "Let that one go by: it is not US-014",
    coachFlood: "Catch Reset, the purple branch!",
    coachBack: "Your files are back: stage them again",
    lensHint: "In your lane",
    faster: "Faster!",
    notUs: "not US-014",
    itemBranch: "US-014 branch",
    itemPr: "Pull Request next",
    selectAllShort: "Select all",
    note: "Recent Changes is a list of suspects, not of culprits. Tick by name, never by position. - V.",
    stagedTitle: "Staged Changes",
    howto: "Jump: stage the crate in your lane",
    byYou: "you",
    ago: "{{n}} min ago",
    older: "last month",
    pRecent: "Recent Changes",
    pCommit: "Commit",
    pPublish: "Save / Publish",
    bannerOrg: "Recent Changes · your dev sandbox",
    go: "Metadata Retriever, your dev sandbox: Recent Changes",
    staged: "Staged: {{name}}",
    missed: "{{name}} went by unstaged: it comes round once more",
    leftOut: "{{name}} went by twice: it stays out of this commit",
    retrieved: "{{n}} of 4 retrieved",
    reportShort: "Your story as the pipeline sees it: {{n}} of its 4 components.",
    infoSkipped: "You did not commit {{names}}: a component missing from the Git Delta package.xml report is missing in the integration org too, and the deployment fails or does half of what you meant.",
    sortOn: "Sorted by Last Updated Date: the newest are lit. Now read the names.",
    selectAll: "Tick the header box: every row at once",
    floodWarn: "It is late. The tick box in the header selects every row in one click.",
    floodOn: "Every row ticked: eighty things you never looked at",
    resetComing: "On the belt: Reset selected list of items to merge",
    resetDone: "the over-wide commit is gone, your changes are back in front of you",
    eightyTitle: "80 files staged",
    eightyTip: "Eighty is never right. Run Reset selected list of items to merge, stage only your own files, discard the rest, and publish again.",
    m_admin: "{{name}} Profile: not your story",
    m_admin_tip: "The Metadata Retriever retrieves a Profile whole, every permission, tab and page layout. If you did not mean to change it, it does not belong in your story.",
    m_object: "A whole object, for one field",
    m_object_tip: "Your story is the field Account.Customer_Tier__c, not the object around it. Tick by name, not by date.",
    m_listview: "An old list view",
    m_listview_tip: "None of it is your story. If you are not sure, leave it out: nothing is lost, it is still in your org.",
    m_apos: "Only &apos; changed",
    m_apos_tip: "The same text, spelled differently, and none of it is your story. Leave it unstaged.",
    m_eol: "{{name}}: only a line break",
    m_eol_tip: "Salesforce drops the last line break, the repository keeps it. Not your story: leave it unstaged.",
    m_generic: "{{name}}: not US-014",
    m_generic_tip: "It came with an older deployment. Count the files in the Source Control view: a one-field story is two to four files. If you did not mean to change it, it does not belong in your story.",
    scTitle: "Source Control",
    scMessage: "Message",
    commitDone: "Committed: US-014 Customer Tier on Account",
    pipeTitle: "DevOps Pipeline",
    saveHint: "Prepares your commits for the team, then pushes the branch",
    qText: "Is your metadata already committed?",
    qPull: "No, retrieve the org changes for me",
    qWhat: "What is a commit?",
    qPullTitle: "Commit first, every time",
    qPullTip: "Commit first, every time: you retrieved, staged and committed, so the answer is Yes, my commit(s) are ready!",
    qWhatAnswer: "A commit is what you just did: your staged files, saved on your branch with a message for the reviewer.",
    reportHint: "Your story as the pipeline sees it: four components, nothing you did not touch.",
    pushQ: "Push the branch to your repository?",
    pushYes: "Yes",
    pushed: "Branch pushed to your repository",
    keyOne: "Enter or OK",
    keyChoose: "Left / right to choose, Enter or OK to answer",
    bossName: 'The "git add ." admin',
    bossArrive: "Commit everything, it's faster!",
    bossLine1: 'Why sort? "git add ." and done!',
    bossLine2: "Profiles too! The whole org!",
    bossGloat: "See? Faster!",
    bossOuch: "Ow! Commit it all, we'll see later!",
    bossOuchProfile: "Hey! I need that Profile!",
    bossThanks: "Thanks! I'll commit it with the rest.",
    bossGiveUp: "OK, OK... one story per commit.",
    bossDown: "Beaten! Your commit carries US-014 only",
    coachBoss: "He stages it all! Jump on what is not US-014",
    coachMine: "Yours: let it roll into your commit",
    coachAngry: "Faster! Keep only your 4 files",
    goalBoss: "Throw back all but US-014",
    lensBack: "Throw it back!",
    lensKeep: "Yours: let it in",
    kept: "Kept: {{name}}",
    tag_profile: "Whole Profile",
    tag_object: "Whole object",
    tag_theirs: "Someone else's",
    tag_leftover: "Test leftover",
    b_profile: "{{name}} Profile in your commit",
    b_profile_tip: "A Profile with everything in it overwrites other people's work: every permission, tab and layout it holds goes to the next org.",
    b_object: "The whole Account object in your commit",
    b_object_tip: "One field is not the whole object: the object file carries every field and setting of Account, other people's too.",
    b_theirs: "{{name}}: someone else's work",
    b_theirs_tip: "It belongs to another story: in your commit it ships before its owner is ready, or overwrites what they changed since.",
    b_leftover: "{{name}}: a test leftover",
    b_leftover_tip: "Nobody asked for it in US-014: committed, it goes to every org of the pipeline without a review.",
    mineBack: "{{name}} is part of US-014",
    mineBackTip: "Your commit needs its 4 files: the field, the layout and the two permission sets. Let them roll in.",
    retryHint: 'Try again starts at the "git add ." admin.',
    retryBoss: 'Straight back to the "git add ." admin: your 4 files are staged'
  },
  fr: {
    intro: "Recent Changes liste tout ce qui, dans votre sandbox de dev, porte votre nom. US-014 n'en compte que quatre : le champ, le layout et les deux permission sets.",
    how1: "Changez de couloir avec les flèches gauche et droite, ou un swipe",
    how2: "Sautez avec Haut ou un tap pour stager vos 4 fichiers",
    how3: "Laissez passer le reste, puis Commit et Save / Publish",
    goalStage: "Stagez les 4 fichiers de US-014 : {{n}} / 4",
    goalFlood: "Attrapez Reset, la branch violette",
    goalEnd: "Commit, puis Save / Publish",
    coachStart: "Sautez quand un de vos 4 fichiers arrive !",
    coachNoise: "Laissez passer celui-là : ce n'est pas US-014",
    coachFlood: "Attrapez Reset, la branch violette !",
    coachBack: "Vos fichiers reviennent : stagez-les à nouveau",
    lensHint: "Dans votre couloir",
    faster: "Plus vite !",
    notUs: "pas US-014",
    itemBranch: "Branch US-014",
    itemPr: "Pull Request ensuite",
    selectAllShort: "Tout sélectionner",
    note: "Recent Changes est une liste de suspects, pas de coupables. Cochez par nom, jamais par position. - V.",
    stagedTitle: "Staged Changes",
    howto: "Sauter : stager la caisse de votre couloir",
    byYou: "vous",
    ago: "il y a {{n}} min",
    older: "le mois dernier",
    pRecent: "Recent Changes",
    pCommit: "Commit",
    pPublish: "Save / Publish",
    bannerOrg: "Recent Changes · votre sandbox de dev",
    go: "Metadata Retriever, votre sandbox de dev : Recent Changes",
    staged: "Stagé : {{name}}",
    missed: "{{name}} est passé sans être stagé : il repasse une fois",
    leftOut: "{{name}} est passé deux fois : il reste hors de ce commit",
    retrieved: "{{n}} sur 4 récupérés",
    reportShort: "Votre story telle que le pipeline la voit : {{n}} de ses 4 composants.",
    infoSkipped: "Vous n'avez pas commité {{names}} : un composant absent du rapport Git Delta package.xml manque aussi dans l'org d'integration, et le déploiement échoue ou ne fait que la moitié de ce que vous vouliez.",
    sortOn: "Trié par Last Updated Date : les plus récents s'allument. Maintenant, lisez les noms.",
    selectAll: "Cocher la case de l'en-tête : toutes les lignes d'un coup",
    floodWarn: "Il est tard. La case de l'en-tête sélectionne toutes les lignes d'un clic.",
    floodOn: "Toutes les lignes cochées : quatre-vingts choses que vous n'avez jamais regardées",
    resetComing: "Sur le tapis : Reset selected list of items to merge",
    resetDone: "le commit trop large a disparu, vos modifications sont de nouveau devant vous",
    eightyTitle: "80 fichiers stagés",
    eightyTip: "Quatre-vingts, jamais. Lancez Reset selected list of items to merge, ne stagez que vos propres fichiers, jetez le reste, et publiez à nouveau.",
    m_admin: "Profile {{name}} : pas votre story",
    m_admin_tip: "Le Metadata Retriever récupère un Profile entier, chaque permission, onglet et page layout. Si vous ne vouliez pas le modifier, il n'a rien à faire dans votre story.",
    m_object: "Tout un objet, pour un champ",
    m_object_tip: "Votre story, c'est le champ Account.Customer_Tier__c, pas l'objet autour. Cochez par nom, pas par date.",
    m_listview: "Une vieille list view",
    m_listview_tip: "Rien de cela n'est votre story. Dans le doute, laissez-la de côté : rien n'est perdu, elle est toujours dans votre org.",
    m_apos: "Seul &apos; a changé",
    m_apos_tip: "Le même texte, écrit autrement, et rien de cela n'est votre story. Laissez-le hors du staging.",
    m_eol: "{{name}} : un saut de ligne",
    m_eol_tip: "Salesforce supprime le dernier saut de ligne, le repository le garde. Pas votre story : laissez-le hors du staging.",
    m_generic: "{{name}} : pas US-014",
    m_generic_tip: "Il est arrivé avec un ancien déploiement. Comptez les fichiers dans la vue Source Control : une story d'un champ, c'est deux à quatre fichiers. Si vous ne vouliez pas le modifier, il n'a rien à faire dans votre story.",
    scTitle: "Source Control",
    scMessage: "Message",
    commitDone: "Commité : US-014 Customer Tier on Account",
    pipeTitle: "DevOps Pipeline",
    saveHint: "Prépare vos commits pour l'équipe, puis pousse la branch",
    qText: "Vos métadonnées sont-elles déjà commitées ?",
    qPull: "Non, récupérez les modifications de l'org pour moi",
    qWhat: "Qu'est-ce qu'un commit ?",
    qPullTitle: "Commitez d'abord, à chaque fois",
    qPullTip: "Commitez d'abord, à chaque fois : vous avez récupéré, stagé et commité, donc la réponse est Yes, my commit(s) are ready!",
    qWhatAnswer: "Un commit, c'est ce que vous venez de faire : vos fichiers stagés, enregistrés sur votre branch avec un message pour le relecteur.",
    reportHint: "Votre story telle que le pipeline la voit : quatre composants, rien que vous n'ayez pas touché.",
    pushQ: "Pousser la branch sur votre repository ?",
    pushYes: "Yes",
    pushed: "Branch poussée sur votre repository",
    keyOne: "Entrée ou OK",
    keyChoose: "Gauche / droite pour choisir, Entrée ou OK pour répondre",
    bossName: "L'admin «\u00a0git add .\u00a0»",
    bossArrive: "Commitez tout, c'est plus rapide !",
    bossLine1: "Pourquoi trier ? «\u00a0git add .\u00a0» et c'est fini !",
    bossLine2: "Les Profiles aussi ! Toute l'org !",
    bossGloat: "Vous voyez ? Plus rapide !",
    bossOuch: "Aïe ! Commitez tout, on verra après !",
    bossOuchProfile: "Hé ! J'ai besoin de ce Profile !",
    bossThanks: "Merci ! Je le commite avec le reste.",
    bossGiveUp: "D'accord, d'accord... une story par commit.",
    bossDown: "Battu ! Votre commit ne porte que US-014",
    coachBoss: "Il stage tout ! Sautez sur ce qui n'est pas US-014",
    coachMine: "À vous : laissez-le rouler dans votre commit",
    coachAngry: "Plus vite ! Gardez seulement vos 4 fichiers",
    goalBoss: "Renvoyez tout sauf US-014",
    lensBack: "Renvoyez-le !",
    lensKeep: "À vous : laissez-le",
    kept: "Gardé : {{name}}",
    tag_profile: "Profile entier",
    tag_object: "Objet entier",
    tag_theirs: "À quelqu'un d'autre",
    tag_leftover: "Reste de test",
    b_profile: "Profile {{name}} dans votre commit",
    b_profile_tip: "Un Profile avec tout dedans écrase le travail des autres : chaque permission, onglet et layout qu'il contient part vers l'org suivante.",
    b_object: "Tout l'objet Account dans votre commit",
    b_object_tip: "Un champ, ce n'est pas tout l'objet : le fichier de l'objet emporte chaque champ et réglage d'Account, ceux des autres aussi.",
    b_theirs: "{{name}} : le travail de quelqu'un d'autre",
    b_theirs_tip: "Il appartient à une autre story : dans votre commit, il part avant que son auteur soit prêt, ou écrase ce qu'il a changé depuis.",
    b_leftover: "{{name}} : un reste de test",
    b_leftover_tip: "Personne ne l'a demandé dans US-014 : commité, il part dans chaque org du pipeline sans relecture.",
    mineBack: "{{name}} fait partie de US-014",
    mineBackTip: "Votre commit a besoin de ses 4 fichiers : le champ, le layout et les deux permission sets. Laissez-les rouler.",
    retryHint: "Réessayer reprend à l'admin «\u00a0git add .\u00a0».",
    retryBoss: "Retour direct à l'admin «\u00a0git add .\u00a0» : vos 4 fichiers sont stagés"
  }
};

/** The strings taken word for word from the labs, checked by scripts/verify/check-easter-egg.mjs. */
export const QUOTES = [
  { lab: "1.5", text: "Metadata Retriever" },
  { lab: "1.5", text: "Recent Changes" },
  { lab: "1.5", text: "Last Updated Date" },
  { lab: "1.5", text: "Retrieve 4 selected" },
  { lab: "1.5", text: "Staged Changes" },
  { lab: "1.5", text: "Source Control" },
  { lab: "1.5", text: "Commit" },
  { lab: "1.5", text: "Save / Publish" },
  { lab: "1.5", text: "Yes, my commit(s) are ready!" },
  { lab: "1.5", text: "Git Delta package.xml" },
  { lab: "1.5", text: "hardis:work:save" },
  { lab: "2.8", text: "Reset selected list of items to merge" },
  { lab: "2.8", text: "sf hardis:work:resetselection" },
  { lab: "2.8", text: "&apos;" },
  { lab: "2.8", text: "Admin" }
];

const BRANCH = "features/US-014-customer-tier";

// When the attempts ran out at the boss: the next start of the world opens him
let bossRetryAt = 0;

export function createWorld(ctx) {
  const { THREE, root, pig, paint, t, hud, random } = ctx;
  const engine = ctx.engine;
  const camera = ctx.camera;
  const disposables = [];

  /* ---------- The hall: floor, belt, gantry, trench, deck, basket ---------- */

  const floorTexture = paint.texture("w2-floor", 256, 256, (c, w, h) => {
    c.fillStyle = "#E8F4FF";
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#D6EBFF";
    c.fillRect(0, 0, w / 2, h / 2);
    c.fillRect(w / 2, h / 2, w / 2, h / 2);
    c.strokeStyle = "#B9DCFC";
    c.lineWidth = 4;
    c.strokeRect(0, 0, w, h);
  });
  floorTexture.wrapS = THREE.RepeatWrapping;
  floorTexture.wrapT = THREE.RepeatWrapping;
  floorTexture.repeat.set(8, 22);
  const floor = new THREE.Mesh(paint.geometry("w2-floor", () => new THREE.BoxGeometry(16, 0.4, 44)), paint.plain(0xffffff, { map: floorTexture, roughness: 0.9 }));
  floor.position.set(0, -0.8, -10);
  floor.receiveShadow = true;
  root.add(floor);
  const floorEdge = new THREE.Mesh(paint.geometry("w2-floor-edge", () => new THREE.BoxGeometry(16.2, 0.12, 44.2)), paint.plain(0x0176d3, { roughness: 0.5 }));
  floorEdge.position.set(0, -1.02, -10);
  root.add(floorEdge);

  // The belt surface: dark slats that scroll toward the guinea pig
  const beltTexture = paint.texture("w2-belt", 64, 64, (c, w, h) => {
    c.fillStyle = "#2B3A4A";
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#3E5266";
    c.fillRect(0, 0, w, h * 0.72);
    c.fillStyle = "#1B2632";
    c.fillRect(0, h * 0.72, w, h * 0.06);
  });
  beltTexture.wrapS = THREE.RepeatWrapping;
  beltTexture.wrapT = THREE.RepeatWrapping;
  const beltLength = -TIP_Z + 27;
  beltTexture.repeat.set(1, beltLength * 2.2);
  const beltTop = paint.plain(0xffffff, { map: beltTexture, roughness: 0.7 });
  const frame = paint.plain(0xc9d3dd, { roughness: 0.45, metalness: 0.3 });
  const brand = paint.plain(0x0176d3, { roughness: 0.45 });
  const navy = paint.plain(0x032d60, { roughness: 0.7 });
  const white = paint.plain(0xffffff, { roughness: 0.5 });
  const beltGeometry = paint.geometry("w2-belt", () => new THREE.BoxGeometry(1.6, 0.16, beltLength));
  const beltCenter = TIP_Z - beltLength / 2;
  for (const x of LANES) {
    const belt = new THREE.Mesh(beltGeometry, [frame, frame, beltTop, frame, frame, frame]);
    belt.position.set(x, BELT_Y - 0.08, beltCenter);
    belt.receiveShadow = true;
    root.add(belt);
  }
  // The frame: four rails between and beside the lanes, with roller caps
  const railGeometry = paint.geometry("w2-rail", () => new THREE.BoxGeometry(0.12, 0.26, beltLength));
  const railXs = [-2.55, -0.85, 0.85, 2.55];
  for (const x of railXs) {
    const rail = new THREE.Mesh(railGeometry, x === -2.55 || x === 2.55 ? brand : paint.plain(0xfe9339, { roughness: 0.45 }));
    rail.position.set(x, BELT_Y - 0.06, beltCenter);
    root.add(rail);
  }
  const capCount = railXs.length * 26;
  const caps = new THREE.InstancedMesh(
    paint.geometry("w2-cap", () => new THREE.CylinderGeometry(0.1, 0.1, 0.14, 12)),
    paint.plain(0x8a99a8, { roughness: 0.3, metalness: 0.6 }),
    capCount
  );
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scaleVector = new THREE.Vector3(1, 1, 1);
  const position = new THREE.Vector3();
  const sideways = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
  caps.frustumCulled = false;
  root.add(caps);
  // Legs under the belt
  const legs = new THREE.InstancedMesh(paint.geometry("w2-leg", () => new THREE.BoxGeometry(0.16, 1.1, 0.16)), frame, 2 * 7);
  for (let i = 0; i < 7; i++) {
    for (const [j, x] of [-2.4, 2.4].entries()) {
      matrix.makeTranslation(x, BELT_Y - 0.75, TIP_Z - 1.5 - i * 4);
      legs.setMatrixAt(i * 2 + j, matrix);
    }
  }
  legs.frustumCulled = false;
  root.add(legs);
  // Drums at the end of each belt: they turn as the belt runs
  const drums = LANES.map((x) => {
    const drum = new THREE.Mesh(paint.geometry("w2-drum", () => new THREE.CylinderGeometry(0.16, 0.16, 1.58, 16)), paint.plain(0x5b6b7b, { roughness: 0.3, metalness: 0.6 }));
    drum.rotation.z = Math.PI / 2;
    drum.position.set(x, BELT_Y - 0.16, TIP_Z);
    root.add(drum);
    return drum;
  });

  // The trench: what falls in stays in Changes, unstaged
  const trench = new THREE.Mesh(paint.geometry("w2-trench", () => new THREE.PlaneGeometry(5.3, 1.1)), paint.label("w2-trench", "Changes", { bg: "#16324F", fg: "#9FB8D0", width: 1024, height: 212, size: 96 }));
  trench.rotation.x = -Math.PI / 2;
  trench.position.set(0, -0.55, TIP_Z + 0.55);
  root.add(trench);

  // The deck the guinea pig stands on, level with the belt
  const deck = new THREE.Mesh(paint.geometry("w2-deck", () => new THREE.BoxGeometry(8, 0.3, 2.9)), [frame, frame, paint.plain(0xf3f5f7, { roughness: 0.8 }), frame, brand, frame]);
  deck.position.set(1.35, BELT_Y - 0.15, TIP_Z + 1.1 + 1.45);
  deck.receiveShadow = true;
  root.add(deck);
  const deckLegs = new THREE.InstancedMesh(paint.geometry("w2-leg", () => new THREE.BoxGeometry(0.16, 1.1, 0.16)), frame, 4);
  [
    [-2.4, TIP_Z + 1.3],
    [5.1, TIP_Z + 1.3],
    [-2.4, TIP_Z + 3.8],
    [5.1, TIP_Z + 3.8]
  ].forEach(([x, z], i) => {
    matrix.makeTranslation(x, BELT_Y - 0.75, z);
    deckLegs.setMatrixAt(i, matrix);
  });
  deckLegs.frustumCulled = false;
  root.add(deckLegs);

  // The gantry where the crates come out: the Metadata Retriever
  const gantry = new THREE.Group();
  gantry.position.set(0, 0, SPAWN_Z + 1.2);
  const postGeometry = paint.geometry("w2-post", () => new THREE.BoxGeometry(0.3, 3.4, 0.3));
  for (const x of [-2.85, 2.85]) {
    const post = new THREE.Mesh(postGeometry, brand);
    post.position.set(x, 1.3, 0);
    gantry.add(post);
  }
  const doorway = new THREE.Mesh(paint.geometry("w2-doorway", () => new THREE.PlaneGeometry(5.4, 1.35)), navy);
  doorway.position.set(0, BELT_Y + 0.66, -0.4);
  gantry.add(doorway);
  const banner = new THREE.Mesh(
    paint.geometry("w2-banner", () => new THREE.PlaneGeometry(6, 1.2)),
    paint.material(
      "w2-banner",
      1024,
      204,
      (c, w, h) => {
        rounded(c, 4, 4, w - 8, h - 8, 18);
        c.fillStyle = SLDS.white;
        c.fill();
        c.lineWidth = 6;
        c.strokeStyle = SLDS.border;
        c.stroke();
        rounded(c, 26, 30, 144, 144, 18);
        c.fillStyle = SLDS.brand;
        c.fill();
        glyph(c, "cloud", 98, 102, 130);
        c.textAlign = "left";
        c.textBaseline = "middle";
        c.fillStyle = SLDS.navy;
        fitText(c, "Metadata Retriever", 196, 72, w - 230, 64, "800");
        c.fillStyle = SLDS.weak;
        fitText(c, t("bannerOrg"), 196, 146, w - 230, 46, "700");
      },
      { side: THREE.DoubleSide, emissive: 0x222222 }
    )
  );
  banner.position.set(0, 2.7, 0);
  gantry.add(banner);
  const plaque = new THREE.Mesh(paint.geometry("w2-plaque", () => new THREE.PlaneGeometry(1.8, 0.87)), paint.plaque());
  plaque.position.set(0, 3.85, 0);
  gantry.add(plaque);
  root.add(gantry);

  // The basket behind the guinea pig: Staged Changes, with its pile
  const basket = new THREE.Group();
  basket.position.set(BASKET_X, BELT_Y, BASKET_Z);
  const wallMaterial = paint.plain(0xf3f3f3, { roughness: 0.6 });
  const bottom = new THREE.Mesh(paint.geometry("w2-basket-bottom", () => new THREE.BoxGeometry(1.9, 0.08, 1.1)), wallMaterial);
  bottom.position.y = 0.04;
  basket.add(bottom);
  const sideWall = paint.geometry("w2-basket-side", () => new THREE.BoxGeometry(0.08, 0.5, 1.1));
  for (const x of [-0.95, 0.95]) {
    const wall = new THREE.Mesh(sideWall, brand);
    wall.position.set(x, 0.25, 0);
    basket.add(wall);
  }
  const backWall = new THREE.Mesh(paint.geometry("w2-basket-back", () => new THREE.BoxGeometry(1.9, 0.5, 0.08)), wallMaterial);
  backWall.position.set(0, 0.25, -0.55);
  basket.add(backWall);
  // The front wall carries the count: its own canvas, drawn again on change
  const basketCanvas = document.createElement("canvas");
  basketCanvas.width = 512;
  basketCanvas.height = 96;
  const basketTexture = new THREE.CanvasTexture(basketCanvas);
  basketTexture.colorSpace = THREE.SRGBColorSpace;
  const basketFace = new THREE.MeshStandardMaterial({ map: basketTexture, roughness: 0.6, emissive: 0x222222 });
  disposables.push(basketTexture, basketFace);
  const frontWall = new THREE.Mesh(paint.geometry("w2-basket-front", () => new THREE.BoxGeometry(1.9, 0.5, 0.08)), [brand, brand, brand, brand, basketFace, brand]);
  frontWall.position.set(0, 0.25, 0.55);
  basket.add(frontWall);
  const pile = new THREE.InstancedMesh(paint.geometry("w2-mini", () => new THREE.BoxGeometry(0.3, 0.22, 0.26)), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }), PILE_MAX);
  disposables.push(pile.material);
  // Every instance gets a colour now: the renderer must see the colour attribute from the first frame
  for (let i = 0; i < PILE_MAX; i++) {
    pile.setColorAt(i, new THREE.Color(0x2e844a));
  }
  pile.count = 0;
  // Its instances move: a bounding sphere computed once would hide them
  pile.frustumCulled = false;
  basket.add(pile);
  root.add(basket);
  const pileColors = { story: new THREE.Color(0x2e844a), flood: new THREE.Color(0x1b96ff), junk: new THREE.Color(0xea001e) };

  function drawBasket(count) {
    const c = basketCanvas.getContext("2d");
    const w = basketCanvas.width;
    const h = basketCanvas.height;
    c.fillStyle = count > 4 ? SLDS.error : SLDS.brand;
    c.fillRect(0, 0, w, h);
    c.fillStyle = SLDS.white;
    c.textAlign = "left";
    c.textBaseline = "middle";
    fitText(c, "Staged Changes", 22, h / 2 + 2, w - 150, 44, "800");
    rounded(c, w - 118, 16, 96, h - 32, 30);
    c.fill();
    c.fillStyle = count > 4 ? SLDS.error : SLDS.brand;
    c.textAlign = "center";
    fitText(c, String(count), w - 70, h / 2 + 2, 84, 46, "800");
    basketTexture.needsUpdate = true;
  }

  function setPile(list) {
    pile.count = Math.min(list.length, PILE_MAX);
    for (let i = 0; i < pile.count; i++) {
      const layer = Math.floor(i / 15);
      const k = i % 15;
      position.set(-0.7 + (k % 5) * 0.35 + (layer % 2) * 0.08, 0.19 + layer * 0.22, -0.32 + Math.floor(k / 5) * 0.32);
      matrix.compose(position, quaternion, scaleVector);
      pile.setMatrixAt(i, matrix);
      pile.setColorAt(i, pileColors[list[i]] || pileColors.flood);
    }
    pile.instanceMatrix.needsUpdate = true;
    if (pile.instanceColor) {
      pile.instanceColor.needsUpdate = true;
    }
    drawBasket(list.length);
    // The story it has staged rides on its back
    pig.setRiders(STORY.filter((def) => staged.includes(def.id)).map((def) => paint.tile("w2-rider-" + def.type, TYPES[def.type].color, TYPES[def.type].glyph)));
  }

  /* ---------- The crates ---------- */

  const crateGeometry = paint.geometry("w2-crate", () => new THREE.BoxGeometry(CRATE.w, CRATE.h, CRATE.d));
  const crateSide = paint.plain(0xe5e8ec, { roughness: 0.55 });
  const crateBottom = paint.plain(0xb0bcc8);
  const tickGeometry = paint.geometry("w2-tick", () => new THREE.PlaneGeometry(0.42, 0.42));
  const tickMaterial = paint.tile("w2-tick", SLDS.brand, "check");
  const noteMaterial = paint.tile("w2-note", "#F2C94C", "note");
  const noteGeometry = paint.geometry("w2-note", () => new THREE.BoxGeometry(0.75, 0.75, 0.75));
  const coinGeometry = paint.geometry("w2-coin", () => new THREE.CylinderGeometry(0.42, 0.42, 0.09, 32));
  const ringGeometry = paint.geometry("w2-ring", () => new THREE.TorusGeometry(0.48, 0.035, 8, 32));
  const coinRim = paint.plain(0xffb020, { metalness: 0.6, roughness: 0.3, emissive: 0x3a2400 });
  const owner = t("byYou");

  // One material per component, cached: the dim and lit effects change it
  const cardMaterials = new Map();
  function cardMaterial(def) {
    if (!cardMaterials.has(def.id)) {
      const when = def.min ? t("ago", { n: def.min }) : t("older");
      const material = paint.material("w2-card:" + def.id, 512, 288, (c, w, h) => drawCrateCard(c, w, h, def, owner + " · " + when, Boolean(def.min), STORY.includes(def), t("notUs")), { emissive: 0x1a1a1a });
      cardMaterials.set(def.id, material);
    }
    return cardMaterials.get(def.id);
  }

  // The sides of a crate take the colour of its type: a belt of colours, not of grey boxes
  const typeSides = {};
  for (const [name, type] of Object.entries(TYPES)) {
    typeSides[name] = paint.plain(new THREE.Color(type.color).getHex(), { roughness: 0.5 });
  }

  // A belt crate is a Lightning card in its type's colour: it reads better than any model
  const crateParts = [];
  const labelGeometry = paint.geometry("w2-crate-label", () => crateLabelGeometry(THREE));
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);

  function syncCrates() {
    if (!crateParts.length) {
      return;
    }
    for (let i = 0; i < POOL; i++) {
      const group = pool[i].group;
      if (group.visible) {
        group.updateMatrix();
      }
      for (const part of crateParts) {
        if (group.visible) {
          matrix.multiplyMatrices(group.matrix, part.local);
          part.mesh.setMatrixAt(i, matrix);
        } else {
          part.mesh.setMatrixAt(i, hidden);
        }
      }
    }
    for (const part of crateParts) {
      part.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  // What to take must show from far away, even on a phone without bloom: a
  // bright shell around the US-014 crates (green, gold for the one in your lane,
  // above 1 so the bloom catches it) and a sign with the short name above them.
  // The noise is grey, with a small "not US-014" stamp.
  const haloGeometry = paint.geometry("w2-halo", () => new THREE.BoxGeometry(CRATE.w * 1.24, CRATE.h * 1.3, CRATE.d * 1.3));
  const storyHalo = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 1.6, 0.55), side: THREE.BackSide, toneMapped: false });
  const laneHalo = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 1.45, 0.2), side: THREE.BackSide, toneMapped: false });
  // At the boss, the junk in your lane glows red: the one to throw back
  const junkHalo = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.9, 0.22, 0.18), side: THREE.BackSide, toneMapped: false });
  disposables.push(storyHalo, laneHalo, junkHalo);
  const noiseSide = paint.plain(0x9aa1ab, { roughness: 0.7 });
  const storySigns = {};
  for (const def of STORY) {
    const type = TYPES[def.type];
    storySigns[def.id] = paint.sign("w2-take-" + def.id, def.sign, { color: type.color, glyph: "check", height: engine.portrait ? 0.05 : 0.045, screen: true });
  }
  // The boss's junk says what it is: a whole Profile, someone else's work...
  const junkSigns = {};
  for (const [kind, glyphName] of Object.entries(JUNK_GLYPHS)) {
    junkSigns[kind] = paint.sign("w2-junk-" + kind, t("tag_" + kind), { color: SLDS.error, glyph: glyphName, height: engine.portrait ? 0.042 : 0.038, screen: true });
  }

  const pool = [];
  for (let i = 0; i < POOL; i++) {
    const group = new THREE.Group();
    const halo = new THREE.Mesh(haloGeometry, storyHalo);
    halo.visible = false;
    group.add(halo);
    const sign = new THREE.Sprite(storySigns.field.material);
    sign.position.y = CRATE.h / 2 + 0.5;
    sign.visible = false;
    group.add(sign);
    const box = crateParts.length
      ? new THREE.Mesh(labelGeometry, crateSide)
      : new THREE.Mesh(crateGeometry, [crateSide, crateSide, crateSide, crateBottom, crateSide, crateSide]);
    box.castShadow = engine.settings.shadows;
    group.add(box);
    const tick = new THREE.Mesh(tickGeometry, tickMaterial);
    tick.rotation.x = -Math.PI / 2;
    tick.position.set(-CRATE.w / 2 + 0.3, CRATE.h / 2 + 0.04, -CRATE.d / 2 + 0.28);
    group.add(tick);
    group.visible = false;
    root.add(group);
    pool.push({ group, box, tick, halo, sign, state: "free" });
  }

  // The special ones, built once each: the note, two power-ups, the header row
  function coin(kind, color, glyphName, label, sign) {
    const group = new THREE.Group();
    // Sort by Last Updated Date sorts records; the reset puts the branch back at its branch point
    const model = ctx.models && ctx.models.get(kind === "reset" ? "branch" : "record", { height: 0.8, shadows: false });
    let disc;
    if (model) {
      model.position.y = -0.4;
      disc = new THREE.Group();
      disc.add(model);
    } else {
      const face = paint.coin("w2-" + kind, color, glyphName, label);
      disc = new THREE.Mesh(coinGeometry, [coinRim, face, face]);
      disc.rotation.x = Math.PI / 2;
    }
    group.add(disc);
    // The ring glows (bloom on the high tier): it says "take me"
    group.add(new THREE.Mesh(ringGeometry, paint.plain(new THREE.Color(color).getHex(), { emissive: new THREE.Color(color).getHex(), emissiveIntensity: 1.8 })));
    const board = paint.sign("w2-sign-" + kind, sign, { color, glyph: glyphName, height: 0.42 });
    board.position.y = 0.85;
    group.add(board);
    group.visible = false;
    root.add(group);
    return { group, spin: disc, board, state: "free" };
  }
  const specials = {
    sort: coin("sort", SLDS.success, "loop", "Sort", "Last Updated Date"),
    reset: coin("reset", SLDS.purple, "loop", "Reset", "Reset"),
    note: (() => {
      const group = new THREE.Group();
      const model = ctx.models && ctx.models.get("note", { height: 0.75, shadows: false });
      let box;
      if (model) {
        model.position.y = -0.375;
        model.rotation.y = Math.PI;
        box = new THREE.Group();
        box.add(model);
      } else {
        box = new THREE.Mesh(noteGeometry, noteMaterial);
        box.castShadow = engine.settings.shadows;
      }
      group.add(box);
      group.visible = false;
      root.add(group);
      return { group, spin: box, state: "free" };
    })(),
    header: (() => {
      const group = new THREE.Group();
      const slab = new THREE.Mesh(paint.geometry("w2-header-slab", () => new THREE.BoxGeometry(5.0, 0.22, 0.7)), [frame, frame, white, frame, brand, frame]);
      slab.position.y = 0.11;
      group.add(slab);
      const board = new THREE.Mesh(
        paint.geometry("w2-header-board", () => new THREE.PlaneGeometry(5.0, 1.15)),
        paint.material("w2-header", 1024, 236, (c, w, h) => drawHeaderRow(c, w, h, t("selectAllShort")), { side: THREE.DoubleSide, emissive: 0x222222 })
      );
      board.position.set(0, 0.8, 0);
      group.add(board);
      group.visible = false;
      root.add(group);
      return { group, spin: null, state: "free" };
    })()
  };

  /* ---------- The state of the run ---------- */

  let lane = 1;
  let pigX = 0;
  let pigY = 0;
  let pigVy = 0;
  let scurry = 0;
  let elapsed = 0;
  let speed = 3.3;
  let rowTimer = 1.2;
  let storyTimer = 2.2;
  const storyQueue = STORY.slice().sort(() => random() - 0.5);
  let storyOnBelt = false;
  let committed = 0;
  let noise = 0;
  let staged = [];
  let flood = "none";
  let floodLeft = 0;
  let floodTimer = 0;
  let resetTimer = 0;
  let eightyDone = false;
  let resetMisses = 0;
  // A story crate comes by twice at most: then it is left out, and the end says so
  const passes = {};
  const skipped = [];
  // A noise crate staged a second time costs points, not another attempt
  const noiseSeen = new Set();
  let sortAt = 10;
  let sortUntil = -1;
  let noteAt = 24;
  let noteChances = 2;
  let noteFound = false;
  let phase = "sort";
  let endTimer = 0;
  let shake = 0;
  let hit = 0;
  let steps = 0;
  let pace = 1;
  let mercy = 0;
  let pop = 0;
  let turn = 0;
  let crates = [];
  // On the belt or in the air: pool entries and specials
  let flights = [];

  function setData() {
    ctx.setData("committed", committed);
    ctx.setData("noise", noise);
    ctx.setData("staged", staged.length);
    ctx.setData("flood", flood);
    ctx.setData("phase", phase);
    ctx.setData("pace", pace.toFixed(2));
    // The boss: off, enter, fight, beaten, gone; his health; what he threw and what came back at him
    ctx.setData("boss", fight.state);
    ctx.setData("bosshp", fight.hp);
    ctx.setData("dumped", fight.dumped);
    ctx.setData("thrownback", fight.back);
    ctx.setData("bosstime", fight.time.toFixed(1));
  }

  /* ---------- HTML: the Staged Changes list and the end cards ---------- */

  const stagedBox = document.createElement("div");
  stagedBox.className = "gr-w2-staged";
  const head = document.createElement("div");
  head.className = "gr-w2-head";
  const headTitle = document.createElement("strong");
  headTitle.textContent = t("stagedTitle");
  const headCount = document.createElement("span");
  headCount.className = "gr-w2-count";
  const headHow = document.createElement("span");
  headHow.className = "gr-w2-how";
  headHow.textContent = t("howto");
  head.append(headTitle, headCount);
  const list = document.createElement("ul");
  const rows = {};
  for (const def of STORY) {
    const li = document.createElement("li");
    const icon = document.createElement("i");
    icon.textContent = TYPES[def.type].abbr;
    icon.style.background = TYPES[def.type].color;
    const name = document.createElement("span");
    name.textContent = def.name;
    li.append(icon, name);
    list.appendChild(li);
    rows[def.id] = li;
  }
  stagedBox.append(head, list);
  hud.layer.appendChild(stagedBox);

  const card = document.createElement("div");
  card.className = "gr-w2-card";
  card.hidden = true;
  hud.layer.appendChild(card);

  // The lens: the crate in the guinea pig's lane, in letters big enough to read
  const lens = document.createElement("div");
  lens.className = "gr-w2-lens";
  lens.hidden = true;
  const lensHint = el("small", "", lens, t("lensHint"));
  const lensIcon = el("i", "", lens);
  const lensBody = el("div", "", lens);
  const lensType = el("b", "", lensBody);
  const lensName = el("span", "gr-w2-lens-name", lensBody);
  const lensWhen = el("em", "", lensBody);
  lensHint.setAttribute("aria-hidden", "true");
  hud.layer.appendChild(lens);
  let lensFor = null;
  let tipBar = null;

  // Where a jump stages: a bright zone at the end of the guinea pig's lane
  const zone = new THREE.Mesh(
    paint.geometry("w2-zone", () => new THREE.PlaneGeometry(1.5, -WINDOW_FAR + TIP_Z)),
    new THREE.MeshBasicMaterial({ color: 0xffd84d, transparent: true, opacity: 0.35, depthWrite: false })
  );
  disposables.push(zone.material);
  zone.rotation.x = -Math.PI / 2;
  zone.position.set(0, BELT_Y + 0.012, (WINDOW_FAR + TIP_Z) / 2);
  root.add(zone);

  function showLens(entry) {
    if (entry === lensFor) {
      return;
    }
    lensFor = entry;
    if (!entry) {
      lens.hidden = true;
      return;
    }
    const type = TYPES[entry.def.type];
    // At the boss the lens says what to do with it
    const mode = entry.role === "junk" ? "back" : entry.role === "mine" ? "keep" : "";
    lensHint.textContent = mode === "back" ? t("lensBack") : mode === "keep" ? t("lensKeep") : t("lensHint");
    lens.classList.toggle("is-back", mode === "back");
    lens.classList.toggle("is-keep", mode === "keep");
    lensIcon.textContent = type.abbr;
    lensIcon.style.background = type.color;
    lensType.textContent = entry.def.type;
    lensName.textContent = entry.def.name;
    lensWhen.textContent = owner + " · " + (entry.def.min ? t("ago", { n: entry.def.min }) : t("older"));
    lensWhen.classList.toggle("is-recent", Boolean(entry.def.min));
    // On a phone it is one line, between the guinea pig and the Staged Changes
    // list: the far end of the belt, where the crates come from, stays clear
    const narrow = window.innerWidth <= 600 && !stagedBox.hidden && !stagedBox.classList.contains("is-done");
    lens.style.bottom = narrow ? stagedBox.offsetHeight + parseFloat(window.getComputedStyle(stagedBox).bottom || "0") + 14 + "px" : "";
    lens.hidden = false;
  }
  let cardStep = null;
  let choices = [];
  let choice = 0;

  /**
   * A mistake. On the last attempt the result card comes up: the world's own
   * cards step aside. Out of attempts at the boss or after him, the card says
   * the next try starts at the boss.
   */
  function lose(title, tip) {
    mercy = MERCY_S;
    const atBoss = phase === "boss" || phase === "end";
    const last = atBoss && ctx.attempts <= 1;
    if (ctx.loseAttempt(title, last ? tip + " " + t("retryHint") : tip) <= 0) {
      card.hidden = true;
      stagedBox.hidden = true;
      say.hidden = true;
      if (atBoss) {
        bossRetryAt = Date.now();
      }
    }
  }

  /** One step of progress: the target pace climbs, with a word when it does. */
  function progressed() {
    steps = Math.min(PACE_STEPS, steps + 1);
    if (steps > 1 && steps < PACE_STEPS + 1 && phase === "sort") {
      // After the toast of the move that earned it
      window.setTimeout(() => ctx.playing && phase === "sort" && hud.toast(t("faster"), "power"), 1300);
    }
  }

  function stepPace(dt) {
    const p = steps / PACE_STEPS;
    // Ease in: gentle early, livelier in the last stretch
    let target = 1 + PACE_GAIN * p * p * (3 - 2 * p);
    mercy = Math.max(0, mercy - dt);
    if (mercy > 0) {
      target = Math.max(1, target - MERCY_DROP);
    }
    // Never a jump: the belt eases toward its pace
    pace += (target - pace) * Math.min(1, dt * 0.8);
    ctx.setData("pace", pace.toFixed(2));
  }

  function renderStaged() {
    headCount.textContent = String(staged.length);
    headCount.classList.toggle("is-over", staged.length > 4);
    for (const def of STORY) {
      rows[def.id].classList.toggle("is-on", staged.includes(def.id));
    }
    if (phase === "sort") {
      hud.goal(flood === "on" ? t("goalFlood") : t("goalStage", { n: committed }));
    }
  }

  /* ---------- Spawning ---------- */

  function laneFree(l, gap) {
    return !crates.some((c) => c.lane === l && c.state === "belt" && c.z < SPAWN_Z + gap);
  }

  function freeLanes(gap) {
    return [0, 1, 2].filter((l) => laneFree(l, gap)).sort(() => random() - 0.5);
  }

  function spawnCrate(def, role, l, extra) {
    const entry = pool.find((p) => p.state === "free");
    if (!entry) {
      return null;
    }
    const face = cardMaterial(def);
    // At the boss, your own files ("mine") look as they did in the sorting
    const story = role === "story" || role === "mine";
    const side = story ? typeSides[def.type] || crateSide : noiseSide;
    entry.halo.visible = story;
    entry.halo.material = storyHalo;
    entry.sign.visible = story || role === "junk";
    if (story || role === "junk") {
      const template = story ? storySigns[def.id] : junkSigns[JUNK_KIND[def.id] || "theirs"];
      entry.sign.material = template.material;
      entry.sign.scale.copy(template.scale);
    }
    entry.box.material = crateParts.length ? face : [side, side, face, crateBottom, face, side];
    // Everything the select-all box or "git add ." staged comes ticked
    entry.tick.visible = role === "flood" || role === "junk" || role === "mine";
    entry.group.visible = true;
    entry.group.scale.setScalar(1);
    entry.group.rotation.set(0, 0, 0);
    Object.assign(entry, { state: "belt", def, role, lane: l, x: LANES[l], z: SPAWN_Z, y: BELT_Y + CRATE.h / 2, mul: 1, recent: Boolean(def.min), age: 0, size: 1, auto: false }, extra);
    placeEntry(entry);
    if (!crates.includes(entry)) {
      crates.push(entry);
    }
    return entry;
  }

  function spawnSpecial(kind, l, z, mul) {
    const entry = specials[kind];
    if (entry.state !== "free") {
      return null;
    }
    entry.group.visible = true;
    entry.group.scale.setScalar(1);
    const y = kind === "header" ? BELT_Y : kind === "note" ? BELT_Y + 0.4 : BELT_Y + 0.75;
    Object.assign(entry, { state: "belt", role: kind, lane: kind === "header" ? -1 : l, x: kind === "header" ? 0 : LANES[l], z: z || SPAWN_Z, y, mul: mul || 1, age: 0 });
    placeEntry(entry);
    if (!crates.includes(entry)) {
      crates.push(entry);
    }
    return entry;
  }

  function placeEntry(entry) {
    entry.group.position.set(entry.x, entry.y, entry.z);
  }

  function release(entry) {
    entry.state = "free";
    entry.group.visible = false;
  }

  function pickNoise() {
    // The recent ones come more often: they are the ones that fool you
    const recent = NOISE.filter((n) => n.min);
    return random() < 0.4 ? recent[Math.floor(random() * recent.length)] : NOISE[Math.floor(random() * NOISE.length)];
  }

  function spawnRow() {
    const lanes = freeLanes(1.7);
    if (!lanes.length) {
      return;
    }
    const story = !storyOnBelt && storyTimer <= 0 && storyQueue.length && flood !== "header" && flood !== "on";
    if (story) {
      spawnCrate(storyQueue.shift(), "story", lanes.shift());
      storyOnBelt = true;
    }
    const count = elapsed > 15 && random() < 0.35 ? 2 : 1;
    for (let i = 0; i < count - (story ? 1 : 0) && lanes.length; i++) {
      spawnCrate(pickNoise(), "noise", lanes.shift());
    }
  }

  /* ---------- Staging ---------- */

  function grab() {
    if (pigY <= 0.001) {
      pigVy = JUMP_SPEED;
    }
    const near = crates.filter((c) => c.state === "belt" && (c.lane === lane || c.role === "header") && c.z > WINDOW_FAR && c.z <= TIP_Z + 0.45);
    if (!near.length) {
      return;
    }
    // The power-ups and the note before a crate in front of them
    const special = near.filter((c) => !c.def).sort((a, b) => b.z - a.z)[0];
    const target = special || near.sort((a, b) => b.z - a.z)[0];
    // At the boss everything comes ticked: the jump unticks it and sends it back at him
    if (target.role === "junk" || target.role === "mine") {
      throwBack(target);
      return;
    }
    switch (target.role) {
      case "header":
        startFlood(target);
        return;
      case "sort":
        release(target);
        sortUntil = elapsed + SORT_S;
        ctx.sound.play("power");
        ctx.collect(30, null);
        hud.toast(t("sortOn"), "power");
        return;
      case "reset":
        release(target);
        applyReset();
        return;
      case "note":
        release(target);
        noteFound = true;
        ctx.sound.play("wheek");
        ctx.foundNote();
        return;
      default:
        fly(target);
    }
  }

  function fly(entry) {
    entry.state = "fly";
    entry.flight = { t: 0, from: entry.group.position.clone() };
    flights.push(entry);
    if (entry.role === "story") {
      storyOnBelt = false;
      ctx.sound.play("wheek");
    }
  }

  function landed(entry) {
    release(entry);
    if (entry.role === "story") {
      staged.push(entry.def.id);
      committed += 1;
      progressed();
      setPile(staged.map((id) => (STORY.some((s) => s.id === id) ? "story" : "flood")));
      ctx.collect(100, t("staged", { name: entry.def.name }));
      if (pig.hop) {
        pig.hop();
      }
      ctx.fx.burst(BASKET_X, BELT_Y + 0.9, BASKET_Z, { count: 28, colors: [0x2e844a, 0x0176d3, 0xfe9339, 0xff538a, 0x9050e9], speed: 3, up: 4, life: 1 });
      pop = 0.35;
      storyTimer = 3 + random() * 2;
    } else if (entry.role === "flood") {
      staged.push("flood");
      setPile(staged.map((id) => (id === "flood" ? "flood" : "story")));
    } else if (entry.role === "mine") {
      keepMine(entry);
    } else if (entry.role === "junk") {
      junkInCommit(entry);
    } else {
      // Noise: it pops back out, and costs an attempt with its reason
      noise += 1;
      shake = 0.35;
      hit = 0.6;
      const why = entry.def.why || "generic";
      if (noiseSeen.has(entry.def.id)) {
        ctx.points(-30);
        hud.toast(t("m_" + why, { name: entry.def.name }), "bad");
        hud.tip(t("m_" + why + "_tip"));
      } else {
        noiseSeen.add(entry.def.id);
        lose(t("m_" + why, { name: entry.def.name }), t("m_" + why + "_tip"));
        hud.coach(t("coachNoise"), 2600);
      }
    }
    renderStaged();
    setData();
  }

  function missed(entry) {
    if (entry.role === "story") {
      storyOnBelt = false;
      passes[entry.def.id] = (passes[entry.def.id] || 0) + 1;
      ctx.points(-50);
      if (passes[entry.def.id] >= 2) {
        skipped.push(entry.def);
        progressed();
        hud.toast(t("leftOut", { name: entry.def.name }), "bad");
      } else {
        storyQueue.push(entry.def);
        storyTimer = 3.5;
        hud.toast(t("missed", { name: entry.def.name }), "bad");
      }
    } else if (entry.role === "noise") {
      // Left unstaged, as it should be: it keeps the streak going
      ctx.collect(10, null);
    } else if (entry.role === "flood" || entry.role === "junk" || entry.role === "mine") {
      // Ticked: it rides on into Staged Changes
      fly(entry);
      return true;
    } else if (entry.role === "header") {
      startFlood(entry);
      return true;
    } else if (entry.role === "reset" && eightyDone) {
      resetMisses += 1;
      if (resetMisses >= 2) {
        // Nobody stays stuck under eighty files: the reset runs, for fewer points
        ctx.points(-150);
        applyReset(true);
      }
    }
    return false;
  }

  /* ---------- The twist: every row at once ---------- */

  function spawnHeader() {
    if (spawnSpecial("header", 1, SPAWN_Z)) {
      flood = "header";
      rowTimer = 2.2;
      hud.toast(t("floodWarn"), "bad");
    hud.coach(t("selectAll"), 2400);
      setData();
    }
  }

  function startFlood(entry) {
    release(entry);
    flood = "on";
    floodLeft = FLOOD;
    floodTimer = 0.4;
    resetTimer = 1.0;
    shake = 0.5;
    ctx.sound.play("hit");
    hud.toast(t("floodOn"), "bad");
    hud.coach(t("coachFlood"), 2800);
    hud.goal(t("goalFlood"));
    setData();
  }

  function stepFlood(dt) {
    floodTimer -= dt;
    while (floodLeft > 0 && floodTimer <= 0) {
      const lanes = freeLanes(1.0);
      if (!lanes.length || !spawnCrate(NOISE[Math.floor(random() * NOISE.length)], "flood", lanes[0], { mul: 1.4 })) {
        floodTimer = 0.05;
        break;
      }
      floodLeft -= 1;
      floodTimer += 0.11;
    }
    resetTimer -= dt;
    if (resetTimer <= 0 && specials.reset.state === "free") {
      // After the eighty, the rescue comes straight to the guinea pig
      // Half the time in the guinea pig's lane, and always after the eighty
      const target = eightyDone || random() < 0.5 ? lane : [0, 1, 2][Math.floor(random() * 3)];
      if (spawnSpecial("reset", target, eightyDone ? -13 : SPAWN_Z + 8, 1.1)) {
        hud.toast(t("resetComing"), "power");
      }
      resetTimer = 2.4;
    }
    const floodOnBelt = crates.some((c) => c.role === "flood");
    if (!eightyDone && floodLeft === 0 && !floodOnBelt && !flights.length) {
      eightyDone = true;
      lose(t("eightyTitle"), t("eightyTip"));
      resetTimer = 0.6;
    }
  }

  function applyReset(auto) {
    ctx.sound.play("power");
    for (const entry of crates) {
      if (entry.role === "flood" && entry.state === "belt") {
        release(entry);
      }
    }
    for (const entry of flights) {
      if (entry.role === "flood") {
        release(entry);
      }
    }
    flights = flights.filter((e) => e.state === "fly");
    // The commits go, the changes stay: the story comes round again, uncommitted
    const back = STORY.filter((s) => staged.includes(s.id));
    for (const def of back) {
      passes[def.id] = 0;
    }
    storyQueue.unshift(...back);
    staged = [];
    committed = 0;
    flood = "done";
    progressed();
    floodLeft = 0;
    storyTimer = 1.2;
    sortAt = elapsed + 3;
    if (!noteFound && noteChances > 0) {
      noteAt = elapsed + 10;
    }
    setPile([]);
    renderStaged();
    if (!auto) {
      ctx.collect(150, null);
    }
    hud.toast("sf hardis:work:resetselection: " + t("resetDone"), "power");
    ctx.sound.play("happy");
    ctx.fx.burst(pigX, BELT_Y + 1.2, PIG_Z - 1.5, { count: 60, colors: [0x9050e9, 0xff538a, 0x1b96ff, 0xffd84d], speed: 5, up: 5, life: 1.4 });
    if (back.length) {
      window.setTimeout(() => ctx.playing && hud.coach(t("coachBack"), 2400), 2000);
    }
    setData();
  }

  /* ---------- The boss: the "git add ." admin ---------- */

  // His face: one of the twenty-one admins, not the one of the last play
  const bossFace = pickAdmins(2, random)[0];
  const bossFaceUrl = adminFaceUrl(bossFace);
  let disposed = false;
  const boss = buildBoss();
  const fight = {
    state: "off",
    hp: BOSS_HP,
    time: 0,
    x: 0,
    tx: 0,
    z: SPAWN_Z + 1.5,
    bob: 0,
    scale: BOSS_SCALE,
    arm: ARM_REST,
    next: 0,
    windup: 0,
    windupTotal: WINDUP_S,
    swing: 0,
    stage: 0,
    flash: 0,
    wobble: 0,
    grace: -1,
    throws: 0,
    mines: 0,
    kept: 0,
    dumped: 0,
    back: 0,
    endAt: 0,
    cue: 0,
    hits: 0,
    lost: 0,
    lastJunk: ""
  };
  // In his hands or in the air towards the belt; thrown back at him
  let tossing = [];
  let returning = [];
  // The kinds of junk that already reached your commit: the first of each kind costs an attempt
  const bossSeen = new Set();
  let beltFactor = 1;
  let pileReset = 0;
  // When the sorting is done: a breath after the last file staged, then he comes out
  let bossAt = -1;
  let autoplay = 0;
  let autoTimer = 0;

  // The check plays the world by itself (window.__guineaRun only exists for checks)
  if (window.__guineaRun) {
    window.__guineaRun.w2 = {
      autoplay(on) {
        autoplay = on === false ? 0 : typeof on === "number" ? on : 1;
      }
    };
  }

  // His health bar, with his face, under the top bar
  const bossBar = el("div", "gr-w2-bossbar", hud.extra);
  bossBar.hidden = true;
  const bossPicture = el("img", "", bossBar);
  bossPicture.alt = "";
  bossPicture.decoding = "async";
  bossPicture.addEventListener("error", () => bossPicture.remove());
  bossPicture.src = bossFaceUrl;
  el("strong", "", bossBar, t("bossName"));
  const bossFill = el("b", "", el("i", "", bossBar));
  // What he shouts, beside his head
  const say = el("div", "gr-w2-say", hud.layer);
  say.hidden = true;
  const sayAt = { until: 0, width: 0, height: 0, x: -1, y: -1, left: false };
  const sayPoint = new THREE.Vector3();

  /** The admin: a big cartoon head over a hoodie, "git add ." on his chest, his pile of everything beside him. */
  function buildBoss() {
    const group = new THREE.Group();
    group.visible = false;
    const shirt = new THREE.MeshStandardMaterial({ color: 0xd63a2f, roughness: 0.65 });
    disposables.push(shirt);
    const trousers = paint.plain(0x22325a, { roughness: 0.7 });
    const shoes = paint.plain(0x1b1b28, { roughness: 0.6 });
    const skin = paint.plain(0xe0ac8a, { roughness: 0.7 });
    const cube = paint.geometry("w2-boss-cube", () => new THREE.BoxGeometry(1, 1, 1));
    const limb = paint.geometry("w2-boss-limb", () => new THREE.CapsuleGeometry(0.16, 0.7, 4, 10));
    const part = (geometry, material, parent, x, y, z, sx, sy, sz) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.scale.set(sx || 1, sy || 1, sz || 1);
      mesh.castShadow = engine.settings.shadows;
      parent.add(mesh);
      return mesh;
    };
    const legs = [-0.27, 0.27].map((x) => {
      const hip = new THREE.Group();
      hip.position.set(x, 1.05, 0);
      part(limb, trousers, hip, 0, -0.5, 0, 1.3, 1.05, 1.3);
      part(cube, shoes, hip, 0, -0.98, 0.1, 0.36, 0.16, 0.52);
      group.add(hip);
      return hip;
    });
    part(paint.geometry("w2-boss-body", () => new THREE.CapsuleGeometry(0.5, 0.55, 6, 16)), shirt, group, 0, 1.72, 0, 1.3, 1, 0.95);
    // The hood rolled behind his neck
    part(paint.geometry("w2-boss-hood", () => new THREE.TorusGeometry(0.42, 0.13, 8, 20)), shirt, group, 0, 2.25, -0.1, 1, 1, 0.7).rotation.x = Math.PI / 2;
    const arms = [-1, 1].map((side) => {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.72, 2.2, 0);
      part(limb, shirt, shoulder, 0, -0.45, 0);
      part(paint.geometry("w2-boss-hand", () => new THREE.SphereGeometry(0.18, 12, 10)), skin, shoulder, 0, -0.92, 0);
      group.add(shoulder);
      return shoulder;
    });
    // The command he lives by, on his chest
    const sign = paint.sign("w2-boss-cmd", "git add .", { color: SLDS.error, glyph: "code", height: 0.5 });
    sign.position.set(0, 1.62, 0.72);
    group.add(sign);
    root.add(group);
    // The face, a disc that always faces the camera: a plain one until the portrait has loaded
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const c = canvas.getContext("2d");
    drawPlainFace(c, 512);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    const faceMaterial = new THREE.MeshBasicMaterial({ map: texture, alphaTest: 0.5, toneMapped: false, fog: false });
    disposables.push(texture, faceMaterial);
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      if (!disposed) {
        c.clearRect(0, 0, 512, 512);
        drawFace(c, image, 512);
        texture.needsUpdate = true;
      }
    };
    // A portrait that does not load keeps the plain face: the world never waits for it
    image.onerror = () => {};
    image.src = bossFaceUrl;
    const face = new THREE.Mesh(paint.geometry("w2-boss-face", () => new THREE.CircleGeometry(BOSS_HEAD, 48)), faceMaterial);
    face.visible = false;
    face.renderOrder = 1;
    root.add(face);
    // Beside him, the whole org piled up, ready to be committed
    const pileMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
    disposables.push(pileMaterial);
    const heap = new THREE.InstancedMesh(crateGeometry, pileMaterial, 16);
    const colors = [0x9aa1ab, 0x0176d3, 0x9aa1ab, 0xc23934, 0x9aa1ab, 0x06a59a, 0x3296ed, 0x9aa1ab];
    for (let i = 0; i < 16; i++) {
      const side = i < 8 ? -1 : 1;
      const k = i % 8;
      const layer = k < 4 ? 0 : k < 7 ? 1 : 2;
      const slot = k < 4 ? k : k < 7 ? k - 4 : 0;
      position.set(side * (3.3 + (slot % 2) * 1.1 + (layer === 1 ? 0.5 : 0)), -0.6 + 0.3 + layer * 0.56, BOSS_Z + 0.6 + Math.floor(slot / 2) * 0.8 + (layer === 2 ? 0.4 : 0));
      quaternion.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, (i * 0.7) % 0.5);
      scaleVector.setScalar(0.72);
      matrix.compose(position, quaternion, scaleVector);
      heap.setMatrixAt(i, matrix);
      heap.setColorAt(i, new THREE.Color(colors[(i * 3) % colors.length]));
    }
    quaternion.identity();
    scaleVector.setScalar(1);
    heap.frustumCulled = false;
    heap.visible = false;
    root.add(heap);
    return { group, legs, arms, face, faceMaterial, shirt, heap };
  }

  /** The sorting is done: he comes out of the Metadata Retriever, and the belt is his. */
  function startBoss() {
    phase = "boss";
    // What still rode the belt falls off: from now on he brings the crates
    for (const entry of crates) {
      ctx.fx.burst(entry.x, entry.y, entry.z, { count: 6, colors: [0x9aa1ab, 0xffffff], speed: 2, up: 2, life: 0.5 });
      release(entry);
    }
    crates = [];
    storyOnBelt = false;
    showLens(null);
    Object.assign(fight, { state: "enter", hp: BOSS_HP, time: 0, x: 0, tx: 0, z: SPAWN_Z + 1.5, next: 0, windup: 0, swing: 0, stage: 0, flash: 0, wobble: 0, grace: -1, throws: 0, mines: 0, cue: 0, lost: 0 });
    boss.group.visible = true;
    boss.face.visible = true;
    boss.heap.visible = true;
    beltFactor = 0.5;
    stagedBox.classList.add("is-boss");
    bossBar.hidden = false;
    bossBar.classList.remove("is-angry");
    renderBossBar();
    ctx.sound.play("bossIn");
    bossSay("bossArrive", 3.4);
    hud.goal(t("goalBoss"));
    // A player who lost a lot comes to him with an attempt back
    if (ctx.attempts < 3) {
      ctx.gainAttempt();
    }
    setData();
  }

  /** Straight to the boss (guinea-at=1, or a try again after the attempts ran out at him): the four files are staged. */
  function skipToBoss(retry) {
    for (const entry of crates) {
      release(entry);
    }
    crates = [];
    staged = STORY.map((def) => def.id);
    committed = STORY.length;
    storyQueue.length = 0;
    flood = "done";
    steps = PACE_STEPS;
    sortAt = -1;
    noteAt = -1;
    setPile(stagedList());
    renderStaged();
    hud.setPath([t("pRecent"), t("pCommit"), t("pPublish")], 0);
    startBoss();
    if (retry) {
      // A little easier too, as after any lost attempt
      mercy = MERCY_S;
      hud.toast(t("retryBoss"), "power");
    }
  }

  function stepBoss(dt, time) {
    fight.time += dt;
    fight.flash = Math.max(0, fight.flash - dt);
    fight.wobble = Math.max(0, fight.wobble - dt);
    fight.swing = Math.max(0, fight.swing - dt);
    // Faster and faster as he loses: the belt, and the music with it
    let target = BOSS_PACE[0] + (BOSS_PACE[1] - BOSS_PACE[0]) * (1 - fight.hp / BOSS_HP);
    mercy = Math.max(0, mercy - dt);
    if (mercy > 0) {
      target = Math.max(1, target - MERCY_DROP * 2);
    }
    pace += (target - pace) * Math.min(1, dt * 0.8);
    ctx.setData("pace", pace.toFixed(2));
    if (fight.state === "enter") {
      fight.z += (BOSS_Z - fight.z) * Math.min(1, dt * 1.6);
      if (!fight.cue && fight.time > 0.9) {
        fight.cue = 1;
        hud.coach(t("coachBoss"), 3400);
      }
      if (fight.time >= BOSS_ENTER_S) {
        fight.state = "fight";
        ctx.bossStarted();
        fight.next = 0.2;
        setData();
      }
    } else if (fight.state === "fight") {
      beltFactor = Math.min(1, beltFactor + dt);
      fight.next -= dt;
      if (fight.windup > 0) {
        fight.windup -= dt;
        if (fight.windup <= 0) {
          releaseThrow();
        }
      } else if (fight.next <= 0) {
        prepareThrow();
      }
    } else if (fight.state === "beaten") {
      beltFactor = Math.max(0.3, beltFactor - dt);
      if (fight.time >= fight.endAt) {
        fight.state = "gone";
        boss.group.visible = false;
        boss.face.visible = false;
        boss.heap.visible = false;
        say.hidden = true;
        setData();
        startEnd();
        return;
      }
    }
    placeBoss(dt, time);
    stepTossing(dt, time);
    stepReturning(dt);
    placeSay();
  }

  /**
   * His next throw: one crate, then pairs, then, angry, three in a row across
   * the lanes. The first two are junk and the third is one of your files, so
   * the rule is seen before the rush. Never onto a lane where a crate just landed.
   */
  function prepareThrow() {
    let lanes = [0, 1, 2].filter(tossLaneFree);
    if (!lanes.length) {
      fight.next = 0.25;
      return;
    }
    let count = 1;
    if (fight.stage >= 2 && fight.throws % 3 === 2 && lanes.length === 3) {
      count = 3;
      lanes = random() < 0.5 ? [0, 1, 2] : [2, 1, 0];
    } else {
      if (fight.stage >= 1 && random() < 0.45) {
        count = 2;
      }
      lanes.sort(() => random() - 0.5);
    }
    count = Math.min(count, lanes.length);
    // Which of them is one of your files: the middle one of three, so the two pieces of junk are far apart
    let mine = -1;
    if (count === 3) {
      mine = 1;
    } else if (fight.throws === 2 || (fight.throws > 2 && random() < (count === 2 ? 0.5 : 0.27))) {
      mine = count === 2 ? Math.floor(random() * 2) : 0;
    }
    for (let i = 0; i < count; i++) {
      const def = i === mine ? nextMine() : nextJunk();
      const entry = spawnCrate(def, i === mine ? "mine" : "junk", lanes[i]);
      if (!entry) {
        break;
      }
      entry.state = "held";
      // Its sign shows once it leaves his hands: held, they would pile up on his chest
      entry.sign.visible = false;
      // Right hand for the lane on the right, left hand for the left one, the third against his chest
      entry.slot = count === 3 ? [1, 2, 0][lanes[i]] : count === 2 ? (lanes[i] > lanes[1 - i] ? 0 : 1) : lanes[i] === 0 ? 1 : 0;
      entry.order = i;
      entry.size = i !== mine && JUNK_KIND[def.id] === "profile" ? PROFILE_SIZE : 1;
      entry.flight = null;
      tossing.push(entry);
    }
    if (mine >= 0) {
      fight.mines += 1;
      if (fight.mines === 1) {
        hud.coach(t("coachMine"), 2800);
      }
    }
    fight.throws += 1;
    fight.windupTotal = WINDUP_S * (count === 3 ? 1.3 : 1);
    fight.windup = fight.windupTotal;
    fight.tx = (lanes.slice(0, count).reduce((sum, l) => sum + LANES[l], 0) / count) * 0.45;
    const p = 1 - fight.hp / BOSS_HP;
    const gap = THROW_GAP[0] + (THROW_GAP[1] - THROW_GAP[0]) * p;
    fight.next = gap * (count === 3 ? 1.75 : count === 2 ? 1.3 : 1) * (mercy > 0 ? 1.35 : 1);
  }

  function tossLaneFree(l) {
    return !crates.some((c) => c.state === "belt" && c.lane === l && c.z < LAND_Z + 1.8) && !tossing.some((c) => c.lane === l);
  }

  /** One of your four files: first those still missing from your commit, then each in turn. */
  function nextMine() {
    const missing = STORY.filter((def) => !staged.includes(def.id));
    const list = missing.length ? missing : STORY;
    return list[fight.mines % list.length];
  }

  /** Junk from Recent Changes, Profiles more often once he is angry, never the same twice in a row. */
  function nextJunk() {
    const profiles = NOISE.filter((def) => JUNK_KIND[def.id] === "profile");
    let def = null;
    for (let k = 0; k < 4 && (!def || def.id === fight.lastJunk); k++) {
      def = random() < (fight.stage >= 2 ? 0.4 : 0.15) ? profiles[Math.floor(random() * profiles.length)] : NOISE[Math.floor(random() * NOISE.length)];
    }
    fight.lastJunk = def.id;
    return def;
  }

  function releaseThrow() {
    for (const entry of tossing) {
      if (entry.state === "held") {
        entry.state = "toss";
        // The crates of one throw leave his hands one after the other
        entry.flight = { t: -(entry.order * BURST_GAP) / TOSS_S, from: new THREE.Vector3() };
      }
    }
  }

  function stepTossing(dt, time) {
    for (const entry of tossing) {
      const f = entry.flight;
      if (!f || f.t <= 0) {
        // Still in his hands
        heldPosition(entry.slot, entry.group.position);
        entry.group.rotation.set(0, Math.sin(time * 7 + entry.slot) * 0.2, 0);
        entry.group.scale.setScalar(HELD_SCALE * entry.size);
        if (f) {
          f.from.copy(entry.group.position);
          f.t += dt / TOSS_S;
          if (f.t > 0) {
            fight.swing = 0.3;
            entry.sign.visible = true;
            ctx.sound.play("bossThrow");
          }
        }
        continue;
      }
      f.t += dt / TOSS_S;
      const k = Math.min(1, f.t);
      const tx = LANES[entry.lane];
      // A bigger crate (a whole Profile) sits on the belt, not in it
      const ty = BELT_Y + (CRATE.h / 2) * entry.size;
      entry.group.position.set(f.from.x + (tx - f.from.x) * k, f.from.y + (ty - f.from.y) * k + Math.sin(Math.PI * k) * TOSS_ARC, f.from.z + (LAND_Z - f.from.z) * k);
      entry.group.rotation.set(-k * Math.PI * 2, 0, 0);
      entry.group.scale.setScalar((HELD_SCALE + (1 - HELD_SCALE) * k) * entry.size);
      if (f.t >= 1) {
        // On the belt, ticked, riding towards your commit
        Object.assign(entry, { state: "belt", x: tx, y: ty, z: LAND_Z, age: 0 });
        entry.group.rotation.set(0, 0, 0);
        placeEntry(entry);
        crates.push(entry);
        fight.dumped += 1;
        ctx.setData("dumped", fight.dumped);
        ctx.fx.burst(tx, BELT_Y + 0.1, LAND_Z, { count: 6, colors: [0xc9d3dd, 0xffffff], speed: 1.6, up: 1.2, life: 0.4 });
      }
    }
    tossing = tossing.filter((e) => e.state === "held" || e.state === "toss");
  }

  /** A jump on a ticked crate: it flies back at him. */
  function throwBack(entry) {
    entry.state = "back";
    entry.flight = { t: 0, from: entry.group.position.clone() };
    returning.push(entry);
    fight.back += 1;
    ctx.sound.play("throw");
    if (entry === lensFor) {
      showLens(null);
    }
    setData();
  }

  function stepReturning(dt) {
    for (const entry of returning) {
      const f = entry.flight;
      f.t += dt / BACK_S;
      const k = Math.min(1, f.t);
      const tx = fight.x;
      const ty = BELT_Y + 1.9 * fight.scale;
      const tz = fight.z + 0.6;
      entry.group.position.set(f.from.x + (tx - f.from.x) * k, f.from.y + (ty - f.from.y) * k + Math.sin(Math.PI * k) * BACK_ARC, f.from.z + (tz - f.from.z) * k);
      entry.group.rotation.set(k * 9, k * 5, 0);
      if (f.t >= 1) {
        entry.state = "hit";
        if (entry.role === "junk") {
          hitBoss(entry);
        } else {
          caughtMine(entry);
        }
        release(entry);
      }
    }
    returning = returning.filter((e) => e.state === "back");
  }

  /** Junk back on its sender: his bar goes down, and he gets louder. */
  function hitBoss(entry) {
    const at = entry.group.position;
    ctx.fx.burst(at.x, at.y, at.z, { count: 16, colors: [0xea001e, 0xffd84d, 0xffffff, 0x9aa1ab], speed: 3.5, up: 3, life: 0.7 });
    if (fight.state !== "fight") {
      return;
    }
    const damage = entry.size > 1 ? 2 : 1;
    fight.hp = Math.max(0, fight.hp - damage);
    fight.hits += 1;
    fight.flash = 0.25;
    fight.wobble = 0.45;
    if (damage > 1) {
      shake = Math.max(shake, 0.2);
    }
    ctx.sound.play("bossHit");
    ctx.collect(damage > 1 ? 60 : 40, null);
    // Now and then he answers back, when he is not already talking
    if (fight.hits % 4 === 1 && sayAt.until <= fight.time) {
      bossSay(damage > 1 ? "bossOuchProfile" : "bossOuch", 1.8);
    }
    if (fight.stage === 0 && fight.hp <= BOSS_HP * 0.65) {
      fight.stage = 1;
      bossSay("bossLine1", 2.8);
      hud.toast(t("faster"), "power");
      fight.next = Math.max(fight.next, 1.2);
    } else if (fight.stage === 1 && fight.hp <= BOSS_HP * 0.3) {
      fight.stage = 2;
      bossSay("bossLine2", 2.8);
      hud.coach(t("coachAngry"), 2400);
      ctx.sound.play("power");
      fight.next = Math.max(fight.next, 1.4);
    }
    renderBossBar();
    if (fight.hp <= 0) {
      beatBoss();
    }
    setData();
  }

  /** Your own file thrown at him: he catches it, glad of it. Points, and a little health back. */
  function caughtMine(entry) {
    if (fight.state !== "fight") {
      return;
    }
    fight.hp = Math.min(BOSS_HP, fight.hp + 1);
    renderBossBar();
    ctx.points(-50);
    ctx.sound.play("wrong");
    const title = t("mineBack", { name: entry.def.name });
    hud.toast(title, "bad");
    hud.tip(t("mineBackTip"), 0, title);
    bossSay("bossThanks", 2.4);
    setData();
  }

  /** One of your files rolled in: staged if it was missing, kept otherwise. */
  function keepMine(entry) {
    const def = entry.def;
    if (!staged.includes(def.id)) {
      staged.push(def.id);
      committed += 1;
      const left = skipped.indexOf(def);
      if (left >= 0) {
        skipped.splice(left, 1);
      }
      setPile(stagedList());
      ctx.collect(100, t("staged", { name: def.name }));
    } else {
      fight.kept += 1;
      ctx.collect(30, fight.kept <= 2 ? t("kept", { name: def.name }) : null);
    }
    pop = 0.35;
    ctx.fx.burst(BASKET_X, BELT_Y + 0.9, BASKET_Z, { count: 14, colors: [0x2e844a, 0x0176d3, 0xffffff], speed: 2.5, up: 3, life: 0.8 });
  }

  /**
   * Junk reached your commit. It pops back out, and the first piece of each
   * kind (a whole Profile, a whole object, someone else's work, a test
   * leftover) says why. It costs an attempt, but never two within a few
   * seconds and never more than BOSS_LOSSES in the fight; otherwise points.
   */
  function junkInCommit(entry) {
    // Still on its way when he gave up: it only pops back out
    if (fight.state !== "fight") {
      ctx.fx.burst(BASKET_X, BELT_Y + 0.9, BASKET_Z, { count: 8, colors: [0x9aa1ab, 0xffffff], speed: 2, up: 2, life: 0.5 });
      return;
    }
    noise += 1;
    shake = 0.35;
    hit = 0.6;
    const kind = JUNK_KIND[entry.def.id] || "theirs";
    const title = t("b_" + kind, { name: entry.def.name });
    const tip = t("b_" + kind + "_tip");
    const first = !bossSeen.has(kind);
    bossSeen.add(kind);
    setPile(stagedList().concat("junk"));
    pileReset = 0.9;
    ctx.fx.burst(BASKET_X, BELT_Y + 0.9, BASKET_Z, { count: 18, colors: [0xea001e, 0x9aa1ab], speed: 3, up: 3, life: 0.8 });
    if (first && fight.time >= fight.grace && fight.lost < BOSS_LOSSES) {
      fight.grace = fight.time + BOSS_GRACE_S;
      fight.lost += 1;
      lose(title, tip);
      if (!ctx.playing) {
        return;
      }
      // A breath to read why: his next throw waits, and he gloats
      fight.next = Math.max(fight.next, 1.8);
      bossSay("bossGloat", 2.2);
    } else {
      ctx.points(-40);
      ctx.sound.play("wrong");
      hud.toast(title, "bad");
      if (first) {
        hud.tip(tip, 0, title);
      }
    }
  }

  /** His crates fall off the belt once he gives up. */
  function clearBossBelt() {
    for (const entry of crates) {
      if (entry.state === "belt") {
        ctx.fx.burst(entry.x, entry.y, entry.z, { count: 8, colors: [0x9aa1ab, 0xffffff], speed: 2.5, up: 2, life: 0.5 });
        release(entry);
      }
    }
    for (const entry of tossing) {
      release(entry);
    }
    tossing = [];
    fight.windup = 0;
  }

  function beatBoss() {
    ctx.bossBeaten();
    bossRetryAt = 0;
    fight.state = "beaten";
    fight.endAt = fight.time + BOSS_BEATEN_S;
    clearBossBelt();
    showLens(null);
    bossSay("bossGiveUp", BOSS_BEATEN_S - 0.4);
    ctx.sound.play("bossDown");
    shake = 0.5;
    ctx.fx.burst(fight.x, BELT_Y + 3, fight.z + 0.6, { count: 70, colors: [0xea001e, 0xffd84d, 0x2e844a, 0x0176d3, 0xffffff], speed: 6, up: 6, life: 1.4 });
    ctx.collect(500, t("bossDown"));
    bossBar.hidden = true;
    hud.goal("");
    setData();
  }

  function renderBossBar() {
    bossFill.style.width = Math.max(0, (fight.hp / BOSS_HP) * 100) + "%";
    bossBar.classList.toggle("is-angry", fight.stage >= 2);
  }

  // His reactions to a hit never cut a line still being read; his arrival,
  // his escalations and his give-up always show, each for its reading time
  const SAY_REACTIONS = ["bossOuch", "bossOuchProfile", "bossThanks", "bossGloat"];

  function bossSay(key, seconds) {
    const reaction = SAY_REACTIONS.includes(key);
    if (reaction && fight.time < (sayAt.read || 0)) {
      return;
    }
    const text = t(key);
    const read = readingMs(text) / 1000;
    say.textContent = keepTogether(text);
    say.hidden = false;
    sayAt.until = fight.time + Math.max(seconds, read);
    sayAt.read = fight.time + (reaction ? 0.6 * read : read);
    sayAt.width = 0;
    sayAt.x = -1;
  }

  /** Where he stands and how he moves: walking in, holding crates up, throwing, shaken by a hit, leaving. */
  function placeBoss(dt, time) {
    if (!boss.group.visible) {
      return;
    }
    fight.x += (fight.tx - fight.x) * Math.min(1, dt * 2.5);
    let scale = BOSS_SCALE;
    let lean = 0;
    let walking = fight.state === "enter" && Math.abs(BOSS_Z - fight.z) > 0.3;
    if (fight.state === "beaten") {
      const left = fight.endAt - fight.time;
      lean = 0.22;
      if (left < BOSS_LEAVE_S) {
        // Back into the Metadata Retriever, smaller and smaller
        walking = true;
        fight.z += (SPAWN_Z + 1.5 - fight.z) * Math.min(1, dt * 1.5);
        scale *= Math.max(0.05, left / BOSS_LEAVE_S);
      }
    }
    const stride = walking ? Math.sin(time * 10) : 0;
    fight.bob = walking ? Math.abs(stride) * 0.1 : Math.sin(time * 2.6) * 0.03;
    fight.scale = scale;
    boss.legs[0].rotation.x = stride * 0.55;
    boss.legs[1].rotation.x = -stride * 0.55;
    // His arms: up while he holds something, a swing as he throws, hanging once beaten
    const holding = tossing.some((e) => !e.flight || e.flight.t <= 0);
    let armTarget = ARM_REST + Math.sin(time * 3) * 0.06;
    if (fight.state === "beaten" || fight.state === "gone") {
      armTarget = 0.1;
    } else if (holding) {
      armTarget = ARM_UP;
    } else if (fight.swing > 0) {
      armTarget = 1.1;
    } else if (walking) {
      armTarget = ARM_REST + stride * 0.2;
    }
    fight.arm += (armTarget - fight.arm) * Math.min(1, dt * (holding ? 9 : 6));
    boss.arms[0].rotation.z = -fight.arm;
    boss.arms[1].rotation.z = fight.arm;
    const wobble = fight.wobble > 0 ? Math.sin(fight.wobble * 38) * fight.wobble * 0.5 : 0;
    boss.group.position.set(fight.x, BELT_Y + fight.bob, fight.z);
    boss.group.rotation.set(lean, 0, wobble);
    boss.group.scale.setScalar(scale);
    // The face over the body, turned to the camera, a little bigger while he shouts
    const shout = sayAt.until > fight.time && !hud.reduced ? 1 + Math.abs(Math.sin(time * 14)) * 0.04 : 1;
    boss.face.position.set(fight.x - Math.sin(wobble) * BOSS_HEAD_Y * scale, BELT_Y + fight.bob + BOSS_HEAD_Y * scale, fight.z + 0.3 * scale);
    boss.face.quaternion.copy(camera.quaternion);
    boss.face.scale.setScalar(scale * shout);
    // A hit flashes him red
    const flash = fight.flash / 0.25;
    boss.shirt.emissive.setRGB(0.7 * flash, 0, 0);
    boss.faceMaterial.color.setRGB(1, 1 - 0.55 * flash, 1 - 0.55 * flash);
  }

  /** Where a crate he holds is: in his right hand (slot 0), his left hand (1), against his chest (2). */
  function heldPosition(slot, out) {
    const s = fight.scale;
    if (slot === 2) {
      return out.set(fight.x, BELT_Y + fight.bob + 1.55 * s, fight.z + 0.95 * s);
    }
    const side = slot === 0 ? 1 : -1;
    // The hand, and half a crate beyond it
    const reach = 1.22;
    return out.set(fight.x + side * (0.72 + Math.sin(fight.arm) * reach) * s, BELT_Y + fight.bob + (2.2 - Math.cos(fight.arm) * reach) * s, fight.z + 0.35 * s);
  }

  /** His speech bubble, beside his head, on the side with room, never under the top bar. */
  function placeSay() {
    if (say.hidden) {
      return;
    }
    if (sayAt.until <= fight.time || !boss.face.visible) {
      say.hidden = true;
      return;
    }
    // On a phone the tip of a mistake goes up beside his head: the bubble steps aside while it shows
    say.classList.toggle("is-hushed", window.innerWidth <= 600 && Boolean(tipBar && tipBar.classList.contains("is-shown")));
    const w = hud.layer.clientWidth;
    const h = hud.layer.clientHeight;
    const headY = BELT_Y + fight.bob + BOSS_HEAD_Y * fight.scale;
    sayPoint.set(fight.x, headY, fight.z).project(camera);
    const cx = ((sayPoint.x + 1) / 2) * w;
    const cy = ((1 - sayPoint.y) / 2) * h;
    sayPoint.set(fight.x + BOSS_HEAD * fight.scale, headY, fight.z).project(camera);
    const r = Math.abs(((sayPoint.x + 1) / 2) * w - cx);
    if (!sayAt.width) {
      sayAt.width = say.offsetWidth;
      sayAt.height = say.offsetHeight;
    }
    const left = cx + r + 14 + sayAt.width > w - 8 && cx - r - 14 - sayAt.width >= 8;
    const x = Math.round(Math.max(8, Math.min(w - 8 - sayAt.width, left ? cx - r - 14 - sayAt.width : cx + r + 14)));
    const overlay = hud.layer.parentElement;
    const top = (overlay && parseFloat(overlay.style.getPropertyValue("--gr-top-end"))) || 0;
    const y = Math.round(Math.max(top + 8, Math.min(h - sayAt.height - 8, cy - sayAt.height / 2)));
    if (x !== sayAt.x || y !== sayAt.y || left !== sayAt.left) {
      sayAt.x = x;
      sayAt.y = y;
      sayAt.left = left;
      say.classList.toggle("is-left", left);
      say.style.transform = "translate(" + x + "px, " + y + "px)";
    }
  }

  function stagedList() {
    return staged.map((id) => (STORY.some((s) => s.id === id) ? "story" : "flood"));
  }

  /** For the check: the world plays itself, taking this share of what it should take (window.__guineaRun.w2.autoplay). */
  function autoStep(dt) {
    autoTimer -= dt;
    if (phase === "sort") {
      const wanted = crates
        .filter((c) => c.state === "belt" && !c.auto && ["story", "sort", "reset", "note", "header"].includes(c.role) && c.z > WINDOW_FAR + 0.7 && c.z <= TIP_Z - 0.05)
        .sort((a, b) => b.z - a.z)[0];
      if (wanted) {
        autoGrab(wanted);
      }
    } else if (phase === "boss" && fight.state === "fight") {
      const junk = crates.filter((c) => c.state === "belt" && !c.auto && c.role === "junk" && c.z > WINDOW_FAR + 0.7 && c.z <= TIP_Z - 0.05).sort((a, b) => b.z - a.z)[0];
      if (junk) {
        autoGrab(junk);
      }
    } else if (phase === "end" && cardStep && autoTimer <= 0) {
      autoTimer = 0.6;
      answer();
    }
  }

  function autoGrab(entry) {
    if (entry.role !== "header") {
      lane = entry.lane;
    }
    // A jump takes the crate in front: wait while something else is in front of it
    const front = crates.filter((c) => c.state === "belt" && (c.lane === lane || c.role === "header") && c.z > WINDOW_FAR && c.z <= TIP_Z + 0.45).sort((a, b) => b.z - a.z);
    const first = front.find((c) => !c.def) || front[0];
    if (first !== entry) {
      return;
    }
    entry.auto = true;
    if (Math.random() < autoplay) {
      grab();
    }
  }

  /* ---------- The end: Commit, Save / Publish, push ---------- */

  function startEnd() {
    hud.goal(t("goalEnd"));
    showEndItem("logo");
    showLens(null);
    bossBar.hidden = true;
    say.hidden = true;
    stagedBox.classList.remove("is-boss");
    zone.visible = false;
    phase = "end";
    endTimer = 1.0;
    lane = 1;
    scurry = 0.4;
    stagedBox.classList.add("is-done");
    hud.setPath([t("pRecent"), t("pCommit"), t("pPublish")], 1);
    setData();
  }

  function showStep(step) {
    cardStep = step;
    card.hidden = false;
    card.replaceChildren();
    choices = [];
    choice = 0;
    const header = el("div", "gr-w2-card-head", card);
    const body = el("div", "gr-w2-card-body", card);
    const hint = el("p", "gr-w2-card-hint", null);
    switch (step) {
      case "commit": {
        el("strong", "", header, t("scTitle"));
        el("span", "gr-w2-branch", header, BRANCH);
        el("div", "gr-w2-done", body, committed === 4 ? "✓ Retrieve 4 selected" : "✓ " + t("retrieved", { n: committed }));
        el("div", "gr-w2-group", body, "Staged Changes  " + committed);
        const files = el("ul", "gr-w2-files", body);
        for (const def of STORY.filter((d) => staged.includes(d.id))) {
          const li = el("li", "", files);
          const icon = el("i", "", li, TYPES[def.type].abbr);
          icon.style.background = TYPES[def.type].color;
          el("span", "", li, def.name);
        }
        el("div", "gr-w2-label", body, t("scMessage"));
        const message = el("div", "gr-w2-message", body);
        el("strong", "", message, "US-014 Customer Tier on Account");
        el("span", "", message, "Adds Customer_Tier__c on Account so sales reps see each customer's tier.");
        addChoice(body, "Commit", "commit", true);
        hint.textContent = t("keyOne");
        break;
      }
      case "publish":
        showEndItem("pr"); {
        el("strong", "", header, t("pipeTitle"));
        el("span", "gr-w2-branch", header, BRANCH);
        el("div", "gr-w2-done", body, "✓ " + t("commitDone"));
        addChoice(body, "Save / Publish", "publish", true, t("saveHint"));
        hint.textContent = t("keyOne");
        break;
      }
      case "question": {
        el("strong", "", header, "hardis:work:save");
        el("span", "gr-w2-branch", header, BRANCH);
        el("p", "gr-w2-question", body, t("qText"));
        addChoice(body, "Yes, my commit(s) are ready!", "yes", true);
        addChoice(body, t("qPull"), "pull", false);
        addChoice(body, t("qWhat"), "what", false);
        hint.textContent = t("keyChoose");
        break;
      }
      default: {
        el("strong", "", header, "Git Delta package.xml");
        el("span", "gr-w2-badge", header, String(committed));
        el("p", "gr-w2-question", body, committed === 4 ? t("reportHint") : t("reportShort", { n: committed }));
        const xml = el("div", "gr-w2-xml", body);
        for (const [type, all] of [
          ["CustomField", ["Account.Customer_Tier__c"]],
          ["Layout", ["Account-Account Layout"]],
          ["PermissionSet", ["Sales_Manager", "Sales_Rep"]]
        ]) {
          const names = all.filter((name) => STORY.some((d) => d.name === name && staged.includes(d.id)));
          if (!names.length) {
            continue;
          }
          const block = el("div", "", xml);
          el("b", "", block, type);
          for (const name of names) {
            el("span", "", block, name);
          }
        }
        el("p", "gr-w2-question", body, t("pushQ"));
        addChoice(body, t("pushYes"), "push", true);
        hint.textContent = t("keyOne");
      }
    }
    card.appendChild(hint);
    highlight();
  }

  function addChoice(parent, text, id, primary, detail) {
    const button = el("button", "gr-button gr-w2-choice" + (primary ? " gr-primary" : ""), parent);
    button.type = "button";
    el("span", "", button, text);
    if (detail) {
      el("small", "", button, detail);
    }
    const index = choices.length;
    button.addEventListener("click", () => {
      choice = index;
      answer();
    });
    choices.push({ id, button });
  }

  function highlight() {
    choices.forEach((c, i) => c.button.classList.toggle("is-selected", i === choice));
  }

  function answer() {
    if (!ctx.playing || !choices[choice] || choices[choice].off) {
      return;
    }
    const id = choices[choice].id;
    switch (id) {
      case "commit":
        ctx.collect(100, "Commit");
        showEndItem("branch");
        showStep("publish");
        return;
      case "publish":
        ctx.sound.play("gate");
        hud.setPath([t("pRecent"), t("pCommit"), t("pPublish")], 2);
        showStep("question");
        return;
      case "pull":
        lose(t("qPullTitle"), t("qPullTip"));
        // Once is enough: the wrong answer cannot be picked again
        choices[choice].button.disabled = true;
        choices[choice].off = true;
        choice = 0;
        highlight();
        return;
      case "what":
        hud.toast(t("qWhatAnswer"), "power");
        return;
      case "yes":
        ctx.collect(100, "Yes, my commit(s) are ready!");
        showStep("report");
        return;
      default: {
        hud.toast(t("pushed"), "good");
        card.hidden = true;
        hud.goal("");
        phase = "done";
        setData();
        const info = skipped.length ? t("infoSkipped", { names: skipped.map((d) => d.name).join(", ") }) : "";
        ctx.points(-100 * skipped.length);
        ctx.finish(noise === 0 && !skipped.length ? 200 : 0, info);
      }
    }
  }

  /* ---------- The frame ---------- */

  function update(dt, time) {
    if (phase === "done") {
      return;
    }
    if (autoplay) {
      autoStep(dt);
    }
    if (phase === "boss") {
      elapsed += dt;
      stepBoss(dt, time);
      speed = BASE_SPEED * pace * beltFactor;
    } else if (phase !== "end") {
      elapsed += dt;
      stepPace(dt);
      speed = BASE_SPEED * pace;
    } else {
      speed = Math.max(0, speed - dt * 5);
      endTimer -= dt;
      if (endTimer <= 0 && !cardStep) {
        showStep("commit");
      }
    }

    if (phase === "sort") {
      storyTimer -= dt;
      if (flood !== "on") {
        rowTimer -= dt;
        if (rowTimer <= 0) {
          spawnRow();
          // The gap between rows grows with the speed: a crate still gives you well over half a second
          rowTimer = Math.max(1.2, 1.7 / Math.sqrt(pace));
        }
      } else {
        stepFlood(dt);
      }
      if (flood === "none" && !storyOnBelt && (committed >= 2 || elapsed > 50 || !storyQueue.length)) {
        spawnHeader();
      }
      if (sortAt > 0 && elapsed >= sortAt && flood !== "on") {
        const lanes = freeLanes(2);
        if (lanes.length && spawnSpecial("sort", lanes[0])) {
          sortAt = -1;
        }
      }
      if (noteAt > 0 && elapsed >= noteAt && !noteFound && flood !== "on") {
        // Victor's note shows briefly: late, fast, in the lane furthest away
        const far = lane === 0 ? 2 : lane === 2 ? 0 : random() < 0.5 ? 0 : 2;
        const clear = !crates.some((c) => c.state === "belt" && c.lane === far && Math.abs(c.z + 10) < 1.6);
        if (clear && spawnSpecial("note", far, -10, 1.7)) {
          noteChances -= 1;
          noteAt = -1;
        }
      }
      if (flood === "done" && !storyOnBelt && !storyQueue.length && !flights.some((f) => f.role === "story")) {
        if (bossAt < 0) {
          bossAt = elapsed + 1.4;
        } else if (elapsed >= bossAt) {
          startBoss();
        }
      }
    }

    // The belt
    const step = speed * dt;
    beltTexture.offset.y = (beltTexture.offset.y + step * 2.2) % 1;
    for (const drum of drums) {
      drum.rotation.x -= step / 0.16;
    }
    const lit = sortUntil > elapsed;
    for (const entry of crates) {
      if (entry.state !== "belt") {
        continue;
      }
      entry.age += dt;
      entry.z += step * entry.mul;
      if (entry.spin) {
        entry.spin.rotation.y = entry.role === "note" ? time * 3 : 0;
        if (entry.role !== "note" && entry.role !== "header") {
          entry.group.rotation.y = time * 2.2;
          // The sign keeps facing the guinea pig while the coin turns
          entry.board.rotation.y = -entry.group.rotation.y;
        }
      }
      if (entry.role === "note") {
        entry.y = BELT_Y + 0.45 + Math.sin(time * 9) * 0.08;
      }
      placeEntry(entry);
      if (entry.z > TIP_Z) {
        if (!missed(entry)) {
          entry.state = "fall";
          entry.vy = 0;
        }
      }
    }
    for (const entry of crates) {
      if (entry.state !== "fall") {
        continue;
      }
      entry.vy -= GRAVITY * dt;
      entry.y += entry.vy * dt;
      entry.z += step * 0.4;
      entry.group.rotation.x += dt * 3;
      placeEntry(entry);
      if (entry.y < -1.4) {
        release(entry);
      }
    }
    for (const entry of flights) {
      const f = entry.flight;
      f.t += dt / FLIGHT_S;
      const k = Math.min(f.t, 1);
      const slot = Math.min(staged.length, PILE_MAX - 1);
      const tx = BASKET_X - 0.7 + (slot % 5) * 0.35;
      const ty = BELT_Y + 0.3 + Math.floor(slot / 15) * 0.22;
      const tz = BASKET_Z - 0.32 + (Math.floor(slot / 5) % 3) * 0.32;
      entry.group.position.set(f.from.x + (tx - f.from.x) * k, f.from.y + (ty - f.from.y) * k + Math.sin(Math.PI * k) * 1.5, f.from.z + (tz - f.from.z) * k);
      entry.group.scale.setScalar(1 - 0.75 * k);
      entry.group.rotation.y = k * Math.PI;
      if (f.t >= 1) {
        entry.state = "landed";
        landed(entry);
      }
    }
    flights = flights.filter((e) => e.state === "fly");
    crates = crates.filter((e) => e.state === "belt" || e.state === "fall");
    syncCrates();

    // Sorted by Last Updated Date: the recent ones glow, the older ones fade
    const pulse = 0.5 + 0.5 * Math.sin(time * 6);
    for (const [id, material] of cardMaterials) {
      const def = STORY.find((s) => s.id === id) || NOISE.find((n) => n.id === id);
      if (lit && STORY.includes(def)) {
        material.emissive.setRGB(0.02, 0.1 + 0.1 * pulse, 0.03);
        material.color.setRGB(1, 1, 1);
      } else if (lit) {
        material.emissive.setRGB(0, 0, 0);
        material.color.setRGB(0.45, 0.45, 0.48);
      } else {
        material.emissive.setRGB(0.1, 0.1, 0.1);
        material.color.setRGB(1, 1, 1);
      }
    }

    // Roller caps along the rails, turning with the belt
    const roll = (elapsed * speed) % 1;
    for (let r = 0; r < railXs.length; r++) {
      for (let i = 0; i < 26; i++) {
        position.set(railXs[r], BELT_Y - 0.06, TIP_Z - 0.4 - i + roll);
        matrix.compose(position, sideways, scaleVector);
        caps.setMatrixAt(r * 26 + i, matrix);
      }
    }
    caps.instanceMatrix.needsUpdate = true;

    // The guinea pig
    const targetX = LANES[lane];
    const dx = targetX - pigX;
    pigX += Math.sign(dx) * Math.min(Math.abs(dx), 12 * dt);
    if (pigY > 0 || pigVy > 0) {
      pigVy -= GRAVITY * dt;
      pigY = Math.max(0, pigY + pigVy * dt);
      if (pigY === 0) {
        pigVy = 0;
      }
    }
    scurry = Math.max(0, scurry - dt);
    pig.object.position.set(pigX, BELT_Y + pigY, PIG_Z);
    turn = phase === "sort" || phase === "boss" ? 0 : Math.min(Math.PI, turn + dt * 4);
    pig.object.rotation.set(0, turn, 0);
    pig.shadow.position.set(pigX, BELT_Y + 0.012, PIG_Z + 0.05);
    pig.state = { running: scurry > 0, airborne: pigY > 0.01, ducking: false, speed: 4, height: pigY };
    hit = Math.max(0, hit - dt);
    pig.hitWobble(hit);
    shake = Math.max(0, shake - dt);
    // The junk that landed in Staged Changes shows red for a moment, then pops back out
    if (pileReset > 0) {
      pileReset -= dt;
      if (pileReset <= 0) {
        setPile(stagedList());
      }
    }
    placeCamera(dt);
    ctx.setData("lane", lane);
    debugData();
    updateLens(time);
    growEndItems(dt, time);
    if (stagedBox.isConnected) {
      const overlay = hud.layer.parentElement;
      stagedBox.classList.toggle("gr-w2-padded", Boolean(overlay && overlay.classList.contains("gr-show-buttons")));
      card.classList.toggle("gr-w2-padded", Boolean(overlay && overlay.classList.contains("gr-show-buttons")));
    }
  }

  // What a check (or a curious tester) can read: where the next thing worth a
  // jump is, and whether it is in reach now
  function updateLens(time) {
    zone.position.x = LANES[lane];
    zone.material.opacity = 0.28 + 0.12 * Math.sin(time * 5);
    if (phase !== "sort" && phase !== "boss") {
      return;
    }
    const near = crates.filter((c) => c.state === "belt" && c.lane === lane && c.def && c.z > -9).sort((a, b) => b.z - a.z)[0];
    showLens(near || null);
    // The shell's Why? box sits where the lens is: the lens steps aside while it
    // shows, except on a phone at the boss, where the box goes up under the top bar
    tipBar = tipBar || (hud.layer.parentElement && hud.layer.parentElement.querySelector(".gr-tipbar"));
    const tipAbove = phase === "boss" && window.innerWidth <= 600;
    lens.classList.toggle("is-hushed", !tipAbove && Boolean(tipBar && tipBar.classList.contains("is-shown")));
    for (const entry of crates) {
      if (entry.state !== "belt" || !entry.def) {
        continue;
      }
      const inLane = entry === near;
      if (entry.role === "junk") {
        // At the boss: red in your lane, the one to throw back
        entry.halo.visible = inLane;
        entry.halo.material = junkHalo;
      } else {
        const own = entry.role === "story" || entry.role === "mine";
        entry.halo.visible = inLane || own;
        entry.halo.material = inLane && entry.role !== "mine" ? laneHalo : storyHalo;
      }
      entry.group.scale.setScalar((entry.size || 1) * (inLane ? 1.06 + 0.04 * Math.sin(time * 8) : 1));
    }
    pop = Math.max(0, pop - 0.016);
    basket.scale.set(1 + pop * 0.4, 1 - pop * 0.3, 1 + pop * 0.4);
  }

  /** Around the belts: office furniture, package.xml boxes, CI runners and your dev sandbox. Nothing in the way. */
  function placeProps() {
    const FLOOR = -0.6;
    const props = [
      ["desk", { height: 0.85 }, -5.1, -6, Math.PI / 2],
      ["computerScreen", { height: 0.5 }, -5.1, -6, Math.PI / 2, 0.85],
      ["chairDesk", { height: 1.0 }, -5.9, -6.2, -Math.PI / 2],
      ["kitchenCoffeeMachine", { height: 0.9 }, -4.4, -9.5, Math.PI / 2],
      ["pottedPlant", { height: 1.3 }, -4.3, -3.2, 0],
      ["pottedPlant", { height: 1.4 }, 6.2, -7.5, 0.5],
      ["plantSmall2", { height: 0.7 }, -4.4, -12, 0],
      ["trashcan", { height: 0.7 }, 6.3, -3.5, 0],
      // package.xml boxes stacked by the belt: what the retrieve feeds
      ["package-xml", { height: 0.9 }, 5.0, -11.5, Math.PI + 0.3],
      ["package-xml", { height: 0.7 }, 5.05, -11.5, Math.PI + 0.8, 0.9],
      ["package-xml", { height: 0.8 }, 5.9, -12.8, Math.PI - 0.4],
      ["package-xml", { height: 0.8 }, -4.7, -15.5, Math.PI + 0.2],
      // The runner that will take the branch once it is pushed
      ["ci-runner", { height: 1.6 }, 5.3, -19, Math.PI - 0.3],
      ["ci-runner", { height: 1.6 }, -4.7, -20.5, Math.PI + 0.3],
      // Your dev sandbox, the org the Metadata Retriever reads, above the gantry
      ["org-cloud", { height: 1.6 }, 0, -25.4, Math.PI, 4.9]
    ];
    for (const [name, size, x, z, turn, lift] of props) {
      const prop = ctx.models && ctx.models.get(name, Object.assign({ shadows: false }, size));
      if (!prop) {
        continue;
      }
      prop.position.set(x, FLOOR + (lift || 0), z);
      prop.rotation.y = turn;
      root.add(prop);
    }
  }

  // The end of the world, on the deck: the Cloudity logo behind the guinea pig,
  // then the branch once committed, then the Pull Request to come once published
  const endItems = {};
  function showEndItem(id) {
    if (endItems[id] || !ctx.models) {
      return;
    }
    // A phone sees a narrow slice: the items come closer to the guinea pig
    const narrow = engine.portrait;
    const side = narrow ? 1.05 : 1.7;
    const spec = {
      logo: ["cloudity-logo", narrow ? 1.0 : 1.3, 0, narrow ? -2.6 : -4.2, narrow ? -0.1 : 0.2, null, SLDS.brand],
      branch: ["branch", narrow ? 0.6 : 0.8, -side, 0.5, 0, t("itemBranch"), SLDS.success],
      pr: ["pull-request", narrow ? 0.6 : 0.8, side, 0.5, 0, t("itemPr"), SLDS.purple]
    }[id];
    const model = ctx.models.get(spec[0], { height: spec[1], shadows: false });
    if (!model) {
      return;
    }
    const holder = new THREE.Group();
    model.rotation.y = Math.PI;
    holder.add(model);
    if (spec[5]) {
      const sign = paint.sign("w2-end-" + id, spec[5], { color: spec[6], glyph: id === "pr" ? "fork" : "branch", height: narrow ? 0.2 : 0.32 });
      sign.position.y = spec[1] + 0.3;
      holder.add(sign);
    }
    holder.position.set(spec[2], BELT_Y + spec[4], spec[3]);
    holder.scale.setScalar(0.01);
    root.add(holder);
    endItems[id] = { holder, grow: 0 };
    ctx.sound.play("power");
    ctx.fx.burst(spec[2], BELT_Y + spec[4] + 0.5, spec[3], { count: 24, speed: 3, up: 3, life: 0.9 });
  }

  function growEndItems(dt, time) {
    for (const item of Object.values(endItems)) {
      item.grow = Math.min(1, item.grow + dt * 3);
      const k = item.grow;
      // A pop: overshoot, then settle
      item.holder.scale.setScalar(Math.max(0.01, k < 1 ? k * 1.15 : 1));
      item.holder.rotation.y = Math.sin(time * 1.5) * 0.25;
    }
  }

  function debugData() {
    // At the boss, what is worth a jump is the junk
    const wanted = crates.filter((c) => c.state === "belt" && (phase === "boss" ? c.role === "junk" : c.role !== "noise" && c.role !== "flood" && c.role !== "header")).sort((a, b) => b.z - a.z)[0];
    ctx.setData("target", wanted ? wanted.lane + ":" + wanted.role : "");
    ctx.setData("reach", wanted && wanted.z > WINDOW_FAR + 0.6 && wanted.z <= TIP_Z ? "1" : "0");
    const front = crates.filter((c) => c.state === "belt" && c.lane === lane && c.def).sort((a, b) => b.z - a.z)[0];
    ctx.setData("front", front && front.z > WINDOW_FAR + 0.6 ? front.role : "");
  }

  const eye = new THREE.Vector3(0, 3.4, 6);
  const focus = new THREE.Vector3(0, 0.6, -6);
  const wantedEye = new THREE.Vector3();
  const wantedFocus = new THREE.Vector3();

  function placeCamera(dt) {
    const portrait = engine.portrait;
    if (phase === "end" || phase === "done") {
      // The guinea pig turned round, above the card
      wantedEye.set(0.4, portrait ? 2.8 : 2.2, portrait ? 6.2 : 4.8);
      wantedFocus.set(0.3, portrait ? -1.6 : -0.5, -1);
    } else if (phase === "boss") {
      // Higher and further back: the admin at the far end and the guinea pig both in view
      if (portrait) {
        wantedEye.set(0.3 + pigX * 0.45, 7.6, 7.4);
        wantedFocus.set(0.3 + pigX * 0.3, 0.4, -6.8);
      } else {
        wantedEye.set(0.6 + pigX * 0.2, 5.4, 5.8);
        wantedFocus.set(0.6 + pigX * 0.1, 1.0, -7.5);
      }
    } else {
      if (portrait) {
        // A narrow screen follows the guinea pig, and looks down on the end of the belt
        wantedEye.set(0.3 + pigX * 0.55, 7.4, 5.4);
        wantedFocus.set(0.3 + pigX * 0.4, -1.2, -3.6);
      } else {
        wantedEye.set(0.6 + pigX * 0.2, 5.0, 4.9);
        wantedFocus.set(0.6 + pigX * 0.1, -0.3, -6);
      }
    }
    const ease = Math.min(1, dt * 4);
    eye.lerp(wantedEye, ease);
    focus.lerp(wantedFocus, ease);
    const jitter = shake > 0 && engine.motion ? (Math.random() - 0.5) * shake : 0;
    // A few degrees wider as the belt speeds up: the speed is felt
    camera.fov = (portrait ? 70 : 58) + (phase === "sort" || phase === "boss" ? (pace - 1) * 10 : 0);
    camera.updateProjectionMatrix();
    camera.position.set(eye.x + jitter, eye.y, eye.z);
    camera.lookAt(focus);
    engine.aimSun(0, -3);
  }

  // Ready for the intro card: a few crates already on the belt
  for (let i = 0; i < 5; i++) {
    const entry = spawnCrate(NOISE[(i * 3) % NOISE.length], "noise", i % 3);
    if (entry) {
      entry.z = -6 - i * 3.6;
      placeEntry(entry);
    }
  }
  setPile([]);
  renderStaged();
  setData();
  placeProps();
  syncCrates();
  pig.object.position.set(0, BELT_Y, PIG_Z);
  pig.shadow.position.set(0, BELT_Y + 0.012, PIG_Z + 0.05);

  return {
    start() {
      // guinea-at=1 (a check setting) opens the boss; so does the try again of a player out of attempts at him
      const at = ctx.params.startAt;
      const retry = !at && bossRetryAt > 0 && Date.now() - bossRetryAt < BOSS_RETRY_MS;
      bossRetryAt = 0;
      if (at >= 1 || retry) {
        skipToBoss(retry);
        return;
      }
      hud.setPath([t("pRecent"), t("pCommit"), t("pPublish")], 0);
      hud.toast(t("go"), "good");
      hud.goal(t("goalStage", { n: 0 }));
      hud.coach(t("coachStart"), 2800);
    },
    update,
    action(name) {
      if (phase === "end") {
        if (!cardStep) {
          return;
        }
        if (name === "left" || name === "right") {
          do {
            choice = (choice + (name === "left" ? choices.length - 1 : 1)) % choices.length;
          } while (choices[choice].off);
          highlight();
        } else if (name === "confirm" || name === "jump" || name === "tap") {
          answer();
        }
        return;
      }
      if (phase !== "sort" && phase !== "boss") {
        return;
      }
      if (name === "left" || name === "right") {
        const next = Math.max(0, Math.min(2, lane + (name === "left" ? -1 : 1)));
        if (next !== lane) {
          lane = next;
          scurry = 0.25;
        }
      } else if (name === "jump" || name === "tap" || name === "confirm") {
        grab();
      }
    },
    idleCamera(time) {
      const portrait = engine.portrait;
      const sway = Math.sin(time * 0.3) * 1.6;
      camera.fov = portrait ? 70 : 58;
      camera.updateProjectionMatrix();
      camera.position.set(4.2 + sway, portrait ? 4.6 : 3.4, portrait ? 7.5 : 5.2);
      camera.lookAt(0, 0.6, -6);
      engine.aimSun(0, -3);
    },
    dispose() {
      disposed = true;
      stagedBox.remove();
      card.remove();
      lens.remove();
      bossBar.remove();
      say.remove();
      if (window.__guineaRun && window.__guineaRun.w2) {
        delete window.__guineaRun.w2;
      }
      hud.goal("");
      caps.dispose();
      legs.dispose();
      deckLegs.dispose();
      pile.dispose();
      boss.heap.dispose();
      for (const part of crateParts) {
        part.mesh.dispose();
      }
      for (const thing of disposables) {
        thing.dispose();
      }
      hud.setPath([], 0);
    }
  };
}

/* ---------- Drawing ---------- */

/**
 * A crate's label. A US-014 crate: its type colour, the same letter tile as the
 * Staged Changes list, big, and the name. Any other crate: grey, smaller, with
 * a red "not US-014" stamp.
 */
function drawCrateCard(c, w, h, def, footer, recent, story, notUs) {
  const type = TYPES[def.type];
  const main = splitName(def.name)[1];
  rounded(c, 4, 4, w - 8, h - 8, 22);
  c.fillStyle = story ? SLDS.white : "#E4E6EA";
  c.fill();
  c.textBaseline = "middle";
  if (story) {
    rounded(c, 18, 18, 150, 150, 22);
    c.fillStyle = type.color;
    c.fill();
    c.fillStyle = SLDS.white;
    c.textAlign = "center";
    fitText(c, type.abbr, 93, 98, 130, 104, "800");
    c.fillStyle = type.color;
    c.textAlign = "left";
    fitText(c, def.type, 186, 56, w - 206, 40, "800");
    c.fillStyle = SLDS.navy;
    fitText(c, main, 186, 124, w - 206, 56, "800");
    c.fillStyle = SLDS.success;
    c.textAlign = "center";
    fitText(c, "US-014 · " + footer, w / 2, h - 52, w - 40, 40, "800");
    c.lineWidth = 12;
    c.strokeStyle = type.color;
    rounded(c, 6, 6, w - 12, h - 12, 22);
    c.stroke();
    return;
  }
  c.fillStyle = "#7B828C";
  c.textAlign = "left";
  fitText(c, def.type, 28, 52, w - 56, 32, "700");
  fitText(c, main, 28, 112, w - 56, 40, "700");
  fitText(c, footer, 28, 166, w - 56, 28, "600");
  // The stamp: what this crate is not
  c.save();
  c.translate(w - 150, h - 58);
  c.rotate(-0.12);
  rounded(c, -120, -32, 240, 64, 14);
  c.lineWidth = 6;
  c.strokeStyle = SLDS.error;
  c.stroke();
  c.fillStyle = SLDS.error;
  c.textAlign = "center";
  fitText(c, notUs, 0, 2, 220, 36, "800");
  c.restore();
  c.lineWidth = 6;
  c.strokeStyle = "#A9AFB8";
  rounded(c, 4, 4, w - 8, h - 8, 22);
  c.stroke();
}

/** The header of the Recent Changes table, with its tick box. */
function drawHeaderRow(c, w, h, label) {
  rounded(c, 4, 4, w - 8, h - 8, 16);
  c.fillStyle = SLDS.white;
  c.fill();
  c.lineWidth = 6;
  c.strokeStyle = SLDS.border;
  c.stroke();
  c.fillStyle = "#F3F3F3";
  c.fillRect(10, 10, w - 20, 104);
  // The tick box, big and tempting
  rounded(c, 30, 28, 68, 68, 10);
  c.fillStyle = SLDS.white;
  c.fill();
  c.lineWidth = 7;
  c.strokeStyle = SLDS.brand;
  c.stroke();
  c.textAlign = "left";
  c.textBaseline = "middle";
  c.fillStyle = SLDS.weak;
  font(c, 40, "700");
  c.fillText("Type", 130, 62);
  c.fillText("Name", 380, 62);
  fitText(c, "Last Updated Date  ▼", 640, 62, 360, 40, "700");
  c.fillStyle = SLDS.brand;
  c.fillRect(10, 122, w - 20, 104);
  c.fillStyle = SLDS.white;
  c.textAlign = "center";
  fitText(c, label, w / 2, 176, w - 60, 46, "800");
}

/** The label of a crate: its front and its top as one mesh, so one draw call. */
function crateLabelGeometry(THREE) {
  const front = new THREE.PlaneGeometry(CRATE.w * 0.86, CRATE.h * 0.8);
  front.translate(0, 0, CRATE.d / 2 + 0.02);
  const top = new THREE.PlaneGeometry(CRATE.w * 0.86, CRATE.d * 0.8);
  top.rotateX(-Math.PI / 2);
  top.translate(0, CRATE.h / 2 + 0.02, 0);
  const geometry = new THREE.BufferGeometry();
  for (const name of ["position", "normal", "uv"]) {
    const a = front.getAttribute(name);
    const b = top.getAttribute(name);
    const array = new Float32Array(a.array.length + b.array.length);
    array.set(a.array, 0);
    array.set(b.array, a.array.length);
    geometry.setAttribute(name, new THREE.BufferAttribute(array, a.itemSize));
  }
  const count = front.getAttribute("position").count;
  const index = Array.from(front.index.array).concat(Array.from(top.index.array, (i) => i + count));
  geometry.setIndex(index);
  front.dispose();
  top.dispose();
  return geometry;
}

/** "Account.Customer_Tier__c" and "Account-Account Layout" read best as their object, then their name. */
function splitName(name) {
  const dot = name.indexOf(".");
  if (dot > 0) {
    return [name.slice(0, dot + 1), name.slice(dot + 1)];
  }
  const dash = name.indexOf("-");
  if (dash > 0) {
    return [name.slice(0, dash + 1), name.slice(dash + 1)];
  }
  return [null, name];
}

/** The admin's portrait, from its SVG, in a round frame with a white ring. */
function drawFace(c, image, size) {
  const r = size / 2;
  c.save();
  c.beginPath();
  c.arc(r, r, r - 2, 0, Math.PI * 2);
  c.fillStyle = SLDS.white;
  c.fill();
  c.beginPath();
  c.arc(r, r, r * 0.9, 0, Math.PI * 2);
  c.clip();
  c.drawImage(image, r * 0.1, r * 0.1, r * 1.8, r * 1.8);
  c.restore();
}

/** A plain cartoon face with a big grin, shown until the portrait has loaded, or if it never does. */
function drawPlainFace(c, size) {
  const u = size / 100;
  c.save();
  c.fillStyle = SLDS.white;
  c.beginPath();
  c.arc(50 * u, 50 * u, 49 * u, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.arc(50 * u, 50 * u, 45 * u, 0, Math.PI * 2);
  c.clip();
  c.fillStyle = "#FFE3D3";
  c.fillRect(0, 0, size, size);
  // A hoodie at the bottom, the head, the hair, the eyes and the grin of someone in a hurry
  c.fillStyle = "#D63A2F";
  c.fillRect(14 * u, 80 * u, 72 * u, 20 * u);
  c.fillStyle = "#E0AC8A";
  c.beginPath();
  c.ellipse(50 * u, 50 * u, 25 * u, 29 * u, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#3B2416";
  c.beginPath();
  c.ellipse(50 * u, 30 * u, 27 * u, 14 * u, 0, Math.PI, Math.PI * 2);
  c.fill();
  c.fillStyle = SLDS.navy;
  for (const x of [41, 59]) {
    c.beginPath();
    c.arc(x * u, 48 * u, 3.2 * u, 0, Math.PI * 2);
    c.fill();
  }
  c.strokeStyle = SLDS.navy;
  c.lineWidth = 3 * u;
  c.lineCap = "round";
  c.beginPath();
  c.arc(50 * u, 58 * u, 10 * u, 0.15 * Math.PI, 0.85 * Math.PI);
  c.stroke();
  c.restore();
}

/** French punctuation: the space before ! ? : ; never breaks a line. */
function keepTogether(text) {
  return text.replace(/ ([!?:;])/g, "\u00a0$1");
}

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

export const CSS = `
.guinea-run .gr-w2-staged {
  position: absolute;
  left: calc(env(safe-area-inset-left, 0px) + 10px);
  bottom: calc(env(safe-area-inset-bottom, 0px) + 12px);
  width: min(390px, calc(100vw - 20px));
  padding: 8px 10px;
  border: 1px solid #c9c9c9;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 2px 6px rgba(3, 45, 96, 0.2);
  color: #181818;
  font-size: 12px;
  pointer-events: none;
}
.guinea-run .gr-w2-staged.gr-w2-padded {
  bottom: calc(env(safe-area-inset-bottom, 0px) + 86px);
}
.guinea-run .gr-w2-staged.is-done {
  display: none;
}
.guinea-run .gr-w2-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}
.guinea-run .gr-w2-head strong {
  color: #032d60;
  font-size: 13px;
}
.guinea-run .gr-w2-count {
  min-width: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: #0176d3;
  color: #ffffff;
  font-weight: 700;
  text-align: center;
}
.guinea-run .gr-w2-count.is-over {
  background: #ea001e;
}
.guinea-run .gr-w2-how {
  margin-left: auto;
  color: #444444;
}
.guinea-run .gr-w2-staged ul,
.guinea-run .gr-w2-files {
  display: grid;
  gap: 3px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.guinea-run .gr-w2-staged li,
.guinea-run .gr-w2-files li {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  color: #032d60;
  font-family: "JetBrains Mono", Consolas, monospace;
}
.guinea-run .gr-w2-staged li span,
.guinea-run .gr-w2-files li span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.guinea-run .gr-w2-staged li i,
.guinea-run .gr-w2-files li i {
  flex: 0 0 auto;
  min-width: 22px;
  padding: 1px 3px;
  border-radius: 3px;
  color: #ffffff;
  font-family: "Open Sans", Arial, sans-serif;
  font-size: 11px;
  font-style: normal;
  font-weight: 800;
  text-align: center;
  opacity: 0.45;
}
.guinea-run .gr-w2-staged li {
  font-size: 14px;
  font-weight: 700;
}
.guinea-run .gr-w2-staged li.is-on {
  color: #2e844a;
  font-weight: 700;
}
.guinea-run .gr-w2-staged li.is-on i {
  opacity: 1;
}
.guinea-run .gr-w2-staged li.is-on span::before {
  content: "\\2713  ";
}
.guinea-run .gr-w2-lens {
  position: absolute;
  left: 50%;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 16px);
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: min(520px, calc(100vw - 32px));
  padding: 8px 16px 8px 10px;
  border: 3px solid #ffd84d;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 4px 0 #f0b400, 0 6px 16px rgba(3, 45, 96, 0.3);
  color: #032d60;
  transform: translateX(-50%);
  pointer-events: none;
}
.guinea-run .gr-w2-lens.is-hushed {
  visibility: hidden;
}
.guinea-run .gr-w2-lens[hidden] {
  display: none;
}
.guinea-run .gr-w2-lens small {
  position: absolute;
  top: -11px;
  left: 14px;
  padding: 0 8px;
  border-radius: 999px;
  background: #ffd84d;
  color: #032d60;
  font-size: 12px;
  font-weight: 800;
}
.guinea-run .gr-w2-lens i {
  flex: 0 0 auto;
  min-width: 40px;
  padding: 8px 4px;
  border-radius: 8px;
  color: #ffffff;
  font-size: 15px;
  font-style: normal;
  font-weight: 800;
  text-align: center;
}
.guinea-run .gr-w2-lens div {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.guinea-run .gr-w2-lens b {
  color: #444444;
  font-size: 13px;
}
.guinea-run .gr-w2-lens-name {
  overflow-wrap: anywhere;
  font-family: "JetBrains Mono", Consolas, monospace;
  font-size: 18px;
  font-weight: 800;
  line-height: 1.2;
}
.guinea-run .gr-w2-lens em {
  color: #5c5c5c;
  font-size: 13px;
  font-style: normal;
  font-weight: 700;
}
.guinea-run .gr-w2-lens em.is-recent {
  color: #2e844a;
}
.guinea-run .gr-w2-card {
  position: absolute;
  left: 50%;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 16px);
  width: min(440px, calc(100vw - 32px));
  max-height: calc(100dvh - 140px);
  overflow-y: auto;
  border: 1px solid #c9c9c9;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 4px 16px rgba(3, 45, 96, 0.35);
  color: #181818;
  font-size: 13px;
  transform: translateX(-50%);
  animation: gr-w2-in 0.25s ease-out;
}
.guinea-run .gr-w2-card.gr-w2-padded {
  bottom: calc(env(safe-area-inset-bottom, 0px) + 86px);
  max-height: calc(100dvh - 210px);
}
.guinea-run .gr-w2-card[hidden] {
  display: none;
}
.guinea-run .gr-w2-card-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid #e5e5e5;
  background: #f3f3f3;
  border-radius: 8px 8px 0 0;
}
.guinea-run .gr-w2-card-head strong {
  color: #032d60;
  font-size: 15px;
}
.guinea-run .gr-w2-branch {
  color: #444444;
  font-family: "JetBrains Mono", Consolas, monospace;
  font-size: 12px;
}
.guinea-run .gr-w2-badge {
  padding: 0 8px;
  border-radius: 999px;
  background: #0176d3;
  color: #ffffff;
  font-weight: 800;
}
.guinea-run .gr-w2-card-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px 6px;
}
.guinea-run .gr-w2-done {
  color: #2e844a;
  font-weight: 700;
}
.guinea-run .gr-w2-group,
.guinea-run .gr-w2-label {
  color: #444444;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}
.guinea-run .gr-w2-files li {
  color: #181818;
  font-size: 12px;
}
.guinea-run .gr-w2-files li i {
  opacity: 1;
}
.guinea-run .gr-w2-message {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  border: 1px solid #c9c9c9;
  border-radius: 4px;
  font-family: "JetBrains Mono", Consolas, monospace;
  font-size: 12px;
}
.guinea-run .gr-w2-question {
  margin: 0;
  font-weight: 700;
}
.guinea-run .gr-w2-xml {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 4px;
  background: #032d60;
  color: #7cfc9a;
  font-family: "JetBrains Mono", Consolas, monospace;
  font-size: 12px;
}
.guinea-run .gr-w2-xml div {
  display: flex;
  flex-direction: column;
}
.guinea-run .gr-w2-xml b {
  color: #ffffff;
}
.guinea-run .gr-w2-xml span {
  padding-left: 12px;
}
.guinea-run .gr-w2-choice {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-height: 44px;
  text-align: left;
}
.guinea-run .gr-w2-choice small {
  font-size: 12px;
  font-weight: 400;
  opacity: 0.9;
}
.guinea-run .gr-w2-choice:disabled {
  opacity: 0.45;
  text-decoration: line-through;
  cursor: not-allowed;
}
.guinea-run .gr-w2-choice.is-selected {
  outline: 3px solid #fe9339;
  outline-offset: 2px;
}
.guinea-run .gr-w2-card-hint {
  margin: 0;
  padding: 4px 14px 10px;
  color: #444444;
  font-size: 12px;
}
@keyframes gr-w2-in {
  from {
    opacity: 0;
    transform: translate(-50%, 12px);
  }
}
.guinea-run .gr-w2-bossbar {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 280px;
  max-width: 560px;
  padding: 3px 12px 3px 3px;
  border: 2px solid #ffffff;
  border-radius: 999px;
  background: rgba(3, 45, 96, 0.92);
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.3);
  color: #ffffff;
  font-size: 14px;
  pointer-events: none;
}
.guinea-run .gr-w2-bossbar[hidden] {
  display: none;
}
.guinea-run .gr-w2-bossbar img {
  flex: 0 0 auto;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #ffffff;
}
.guinea-run .gr-w2-bossbar strong {
  white-space: nowrap;
}
.guinea-run .gr-w2-bossbar i {
  flex: 1 1 auto;
  display: block;
  min-width: 90px;
  height: 12px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
}
.guinea-run .gr-w2-bossbar b {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #ff5d2d, #ea001e);
  transition: width 0.15s;
}
.guinea-run .gr-w2-bossbar.is-angry b {
  background: linear-gradient(90deg, #ea001e, #ba0517);
  animation: gr-w2-blink 0.5s infinite;
}
@keyframes gr-w2-blink {
  50% {
    opacity: 0.55;
  }
}
.guinea-run .gr-layer > .gr-w2-say {
  position: absolute;
  left: 0;
  top: 0;
  width: max-content;
  max-width: 230px;
  padding: 6px 12px;
  border: 2px solid #032d60;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 3px 0 rgba(3, 45, 96, 0.35);
  color: #032d60;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.25;
  pointer-events: none;
}
.guinea-run .gr-layer > .gr-w2-say[hidden] {
  display: none;
}
.guinea-run .gr-layer > .gr-w2-say.is-hushed {
  visibility: hidden;
}
.guinea-run .gr-w2-say::after {
  content: "";
  position: absolute;
  top: 12px;
  left: -8px;
  width: 12px;
  height: 12px;
  border-left: 2px solid #032d60;
  border-bottom: 2px solid #032d60;
  background: #ffffff;
  transform: rotate(45deg);
}
.guinea-run .gr-w2-say.is-left::after {
  left: auto;
  right: -8px;
  transform: rotate(225deg);
}
.guinea-run .gr-w2-lens.is-back {
  border-color: #ea001e;
  box-shadow: 0 4px 0 #ba0517, 0 6px 16px rgba(3, 45, 96, 0.3);
}
.guinea-run .gr-w2-lens.is-back small {
  background: #ea001e;
  color: #ffffff;
}
.guinea-run .gr-w2-lens.is-keep {
  border-color: #2e844a;
  box-shadow: 0 4px 0 #22683a, 0 6px 16px rgba(3, 45, 96, 0.3);
}
.guinea-run .gr-w2-lens.is-keep small {
  background: #2e844a;
  color: #ffffff;
}
@media (prefers-reduced-motion: reduce) {
  .guinea-run .gr-w2-bossbar.is-angry b {
    animation: none;
  }
}
/* At the boss, the coach speaks from the left: in the middle it would hide the admin and what he throws */
@media (min-width: 601px) {
  .guinea-run[data-world="2"][data-phase="boss"] .gr-coach {
    top: 40%;
    left: calc(env(safe-area-inset-left, 0px) + 16px);
    max-width: min(400px, calc(50vw - 90px));
    padding: 10px 18px;
    font-size: clamp(17px, 2.2vw, 24px);
    transform: translate(0, -50%) scale(0.6);
    transform-origin: left center;
  }
  .guinea-run[data-world="2"][data-phase="boss"] .gr-coach.is-shown {
    animation-name: gr-w2-coach-in;
  }
  @keyframes gr-w2-coach-in {
    to {
      opacity: 1;
      transform: translate(0, -50%) scale(1);
    }
  }
}
@media (min-width: 601px) and (prefers-reduced-motion: reduce) {
  .guinea-run[data-world="2"][data-phase="boss"] .gr-coach.is-shown {
    transform: translate(0, -50%);
  }
}
@media (min-width: 601px) {
  .guinea-run .gr-w2-lens {
    left: calc(50% + 150px);
  }
}
@media (max-width: 600px) {
  .guinea-run .gr-w2-lens {
    left: 16px;
    right: 16px;
    gap: 8px;
    max-width: none;
    padding: 6px 10px 4px 8px;
    transform: none;
  }
  .guinea-run .gr-w2-lens i {
    min-width: 32px;
    padding: 4px 3px;
    font-size: 13px;
  }
  .guinea-run .gr-w2-lens b,
  .guinea-run .gr-w2-lens em {
    display: none;
  }
  .guinea-run .gr-w2-lens-name {
    overflow: hidden;
    font-size: 15px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .guinea-run .gr-w2-staged li {
    font-size: 13px;
  }
  .guinea-run .gr-w2-staged {
    left: 16px;
    right: 16px;
    width: auto;
  }
  .guinea-run .gr-w2-how {
    margin-left: 0;
    flex-basis: 100%;
  }
  /* At the boss, Staged Changes shrinks to one line: the belt needs the room */
  .guinea-run .gr-w2-staged.is-boss {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 10px;
  }
  .guinea-run .gr-w2-staged.is-boss .gr-w2-head {
    margin-bottom: 0;
  }
  .guinea-run .gr-w2-staged.is-boss ul {
    display: flex;
    gap: 4px;
  }
  .guinea-run .gr-w2-staged.is-boss li span {
    display: none;
  }
  .guinea-run .gr-layer > .gr-w2-say {
    max-width: 165px;
    padding: 4px 9px;
    font-size: 13px;
  }
  .guinea-run .gr-w2-bossbar {
    min-width: 0;
    font-size: 15px;
  }
  /* At the boss the end of the belt is where you play: the tip after a mistake goes up under the top bar, short and wide */
  .guinea-run[data-world="2"][data-phase="boss"] .gr-tipbar,
  .guinea-run.gr-show-buttons[data-world="2"][data-phase="boss"] .gr-tipbar {
    top: calc(var(--gr-top-end, 160px) + 6px);
    bottom: auto;
    width: calc(100vw - 24px);
    padding: 6px 10px;
    font-size: 12.5px;
    line-height: 1.3;
  }
}
`;