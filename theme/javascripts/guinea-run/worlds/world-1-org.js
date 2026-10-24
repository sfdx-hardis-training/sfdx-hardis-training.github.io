/*
 * World 1, Build it in the org: a side-on platformer through what a
 * contributor does, in the order a real story goes.
 *
 * First New User Story: the type, the name, the org, and the branch it
 * creates. Two answers of the command are traps that give way under the
 * guinea pig: Fix is for something already delivered, and Create new scratch
 * org fails after a long wait.
 *
 * Then one stop per metadata the story creates or updates: the custom field
 * Account.Customer_Tier__c, the page layout Account-Account Layout, then the
 * permission sets Sales_Rep and Sales_Manager. Between the field and the
 * layout, a trap: keeping Visible ticked for the profiles, when access goes
 * through a permission set.
 *
 * The twist: after Save the guinea pig is a ghost, because a field no
 * permission grants is invisible to everybody, the admin who created it
 * included. Only Sales_Manager, the permission set you hold, makes it visible
 * again. The sales reps get Read Access only: Edit Access floats above their
 * row as a temptation.
 *
 * Vegetables are bonus points all along, as in world 0. At the end the
 * account Acme Corp shows Customer Tier: Gold.
 *
 * Two mushrooms make the guinea pig giant for a while, for fun and points:
 * one in a ? block above Object Manager, bumped from below, one floating above
 * Sales_Rep. A giant smashes the validation rules it touches and eats
 * vegetables from further away, and a fall only shrinks it back. It never
 * skips a lesson: the wrong answers still give way under it, and the parts are
 * still taken one by one.
 *
 * After Acme Corp, a castle, the way the SNES Mario castles end: a bridge
 * over the lava, an admin on it who wants one monster Flow for everything,
 * and an axe at the far end. He throws Flows, low (jump them) or high (stay
 * down), and jumps now and then: the guinea pig runs under him while he is
 * up, or jumps right over him with good timing, and touches the axe.
 * The bridge goes down segment by segment and he falls into the lava,
 * screaming. Out of hearts there, the next try starts at the bridge.
 */
import { SLDS, rounded, fitText, glyph, font, pictureBox, wrapLines } from "../core/painter.js";
import { pickAdmins, adminFaceUrl } from "../core/faces.js";
import { readingMs } from "../hud.js";

export const PADS = ["left", "right", "jump"];
// The course's own items for the parts of the story; Kenney flags and far-away
// islands for the scenery; the vegetables for the bonus points
export const MODELS = ["salesforce", "platform", "nature", "vegetables"];
// The world's theme (core/themes.js); the castle switches it to its darker
// variation. The shell reads this binding every frame, so a change is heard at once
export let MUSIC = 1;

// The bonus vegetables, one kind per model of the vegetables pack (as in world 0)
const VEGETABLES = ["fennel", "carrot", "bellPepper", "cucumber", "romaine", "parsley"];
const VEGETABLE_MODELS = { fennel: "fennel", carrot: "carrot", bellPepper: "bell-pepper", cucumber: "cucumber", romaine: "romaine", parsley: "parsley" };
const VEGETABLE_COLORS = { fennel: "#7BC96F", carrot: "#FF8A3D", bellPepper: "#E8473B", cucumber: "#3E9B4F", romaine: "#8CD17D", parsley: "#2E844A" };
const VEGETABLE_POINTS = 15;

// The power-up: a mushroom makes the guinea pig giant for a while
const GIANT_SCALE = 2.2;
const GIANT_S = 10;
// The last seconds blink: it is about to shrink
const GIANT_WARN_S = 2;
const GROW_S = 0.5;
const MUSHROOM_POINTS = 100;
const SMASH_POINTS = 100;
const MUSHROOM_HEIGHT = 0.9;
const MUSHROOM_RADIUS = 0.8;
// One in a ? block above Object Manager (bumped from below, it hops out to the
// left and waits on the floor), one floating above Sales_Rep, a jump up
const MUSHROOMS = [
  { block: { x0: 63.5, x1: 64.5, bottom: 3.5 }, landX: 62.5 },
  { x: 122, y: 5.3 }
];

// Which item each part shows: what it means in the story
function partItem(def) {
  const BY_LABEL = {
    "New User Story": "ticket",
    Feature: "ticket",
    "US-014-customer-tier": "ticket",
    "Sandbox org with source tracking": "scratch-cloud",
    "features/US-014-customer-tier": "branch",
    Open: "scratch-cloud"
  };
  return def.item || BY_LABEL[def.label] || "custom-field";
}

export const TEXTS = {
  en: {
    intro: "US-014, Show the customer tier on accounts. Start it on its own branch, then build it in Setup: one field, one layout, two permission sets.",
    how1: "Run with Left and Right, jump with Up or Space",
    how2: "Grab the glowing item: the next step of the story",
    how3: "Eat vegetables for bonus points, reach Acme Corp",
    goalNext: "Next: {{label}}",
    goalEnd: "Run to Acme Corp",
    c_start: "Run right and jump the gaps!",
    faster: "Faster!",
    c_trap: "Wrong answer: jump back up!",
    c_hazard: "Wait for the red cross to move, then go",
    c_fall: "Back at the last flag: try again",
    c_ghost: "Invisible! Grab Sales_Manager to be seen again",
    c_visible: "Visible again! Run to Acme Corp",
    c_lift: "Ride the Edit button up",
    coachVeg: "Yum! Vegetables are bonus points",
    c_mushroom: "A mushroom! Eat it to grow",
    giant: "Giant guinea pig!",
    giantLeft: "Giant {{n}}",
    giantHit: "Ouch! Back to normal size",
    smashed: "Validation rule smashed!",
    info_mushroom: "You missed the mushroom: bump the ? block above Object Manager from below to grow giant.",
    note: "Created a field and cannot see it? Nobody can. Grant it in a permission set, never a profile, then look at a real record before you call it done. - V.",
    path0: "New User Story",
    path1: "Field and layout",
    path2: "Permission sets",
    path3: "Record page",
    parts: "Parts",
    vegetablesCount: "Vegetables: {{n}}.",
    invisible: "Invisible",
    q_type: "What type of User Story do you want to create?",
    q_org: "Which Salesforce org do you want to work in?",
    o_fall: "Session expired or invalid",
    o_fall_tip: "Open the org again from Orgs Manager: the extension uses the credential it stored, no password, no login page.",
    o_fix: "Fix is for something already delivered",
    o_fix_tip: "US-014 adds something that was not there: answer Feature: a new capability or an improvement.",
    o_create: "The command fails after a long wait",
    o_create_tip: "Never take Create new scratch org here: your work goes in your dev sandbox, and a Dev Hub that reached its scratch org limit fails after a long wait. Take Sandbox org with source tracking.",
    o_profile: "The profiles would get the field",
    o_profile_tip: "Clear Visible for every profile on the field-level security screen: in this project access goes through a permission set, never a profile.",
    o_valid: "Save fails with a validation rule error",
    o_valid_tip: "A validation rule of the org refused the record. If you changed a value by accident, put it back to a valid one before you save again.",
    o_repEdit: "Leave Edit Access unticked on the sales reps",
    o_repEdit_tip: "A sales rep reads the tier of a customer, the sales managers decide it.",
    v_hazard: "Validation rule",
    v_pit: "Session expired or invalid",
    v_ghostSign: "Customer Tier: visible to nobody",
    v_orgAlias: "Org · ALIAS",
    v_devSandbox: "Your dev sandbox",
    v_openDev: "Open dev sandbox",
    v_profileKeep: "Keep Visible ticked for the profiles",
    v_profileClear: "Clear Visible for every profile",
    m_field: "Created: the Picklist that shows the tier of each customer",
    m_layout: "Updated: puts Customer Tier on the Account record page",
    m_rep: "Updated: Read Access for the sales reps, who read the tier",
    m_manager: "Updated: Read and Edit Access for the sales managers, you included",
    branch: "git checkout -b features/US-014-customer-tier",
    target: "Target branch: integration",
    fieldName: "Field Name: Customer_Tier (Salesforce adds __c when it saves)",
    saved: "Customer_Tier__c saved",
    ghost: "Customer Tier is invisible to everybody, you included",
    ghostTick: "No profile, no permission set grants it yet",
    repRead: "The sales reps can read it. You still cannot: you hold Sales Manager",
    mgrRead: "Visible again: Sales Manager grants it to you",
    refresh: "Refresh: one more attempt",
    info_ghost: "You reached Acme Corp still invisible: without Read Access on Sales Manager, the record shows you nothing.",
    info_field: "You skipped the custom field: Customer_Tier__c is what the whole story builds.",
    info_rep: "You skipped Sales_Rep: the sales reps could not see the field.",
    info_layout: "You skipped Account-Account Layout: that is what puts the field on the record page.",
    info_other: "Also missed: {{list}}.",
    outOfOrder: "{{label}}, out of order: {{first}} comes first",
    done: "Customer Tier on Acme Corp: {{n}}",
    doneGhost: "Acme Corp shows no Customer Tier: nothing grants it to you",
    veg_fennel: "Fennel",
    veg_carrot: "Carrot",
    veg_bellPepper: "Bell pepper",
    veg_cucumber: "Cucumber",
    veg_romaine: "Romaine",
    veg_parsley: "Parsley",
    c_castle: "Keep running right: someone waits on the bridge",
    goalBoss: "Touch the axe behind the admin",
    adminName: "The admin",
    adminSay: "Stop! I'm building a monster Flow, and everything goes in it: US-014, the emails, the whole org!",
    youSay: "Small Flows, sure. The rest in simple Apex and LWC: with agentic engineering, a coding agent writes and tests them with me.",
    c_axe: "Get past him and touch the axe!",
    c_flow: "Jump the low Flows, stay down under the high ones",
    c_under: "He jumps: run under him!",
    o_flowHit: "Hit by the monster Flow",
    o_flowHit_tip: "One Flow that does everything is hard to read, test and deploy. Jump the low Flows, stay down under the high ones.",
    o_admin: "Bumped into the admin",
    o_admin_tip: "Run under him when he jumps, or take off a little before him and jump right over.",
    o_lava: "Into the lava",
    o_lava_tip: "Stay on the bridge: the axe is at the far end, behind the admin.",
    retryHint: "Try again starts at the bridge.",
    retryBoss: "Straight back to the bridge: the field is built",
    scream: "Flows, flows everywheeeeere!",
    bossDown: "The monster Flow went down with the bridge!",
    info_boss: "Flows are great for simple automation. When one grows into a monster, put the logic in simple Apex and LWC: with agentic engineering, a coding agent writes them with you, tests included, and you review."
  },
  fr: {
    intro: "US-014, afficher le niveau client sur les comptes. Démarrez-la sur sa propre branch, puis construisez-la dans Setup : un champ, une présentation de page, deux permission sets.",
    how1: "Courez avec Gauche et Droite, sautez avec Haut ou Espace",
    how2: "Prenez l'élément qui brille : la prochaine étape de la story",
    how3: "Mangez des légumes pour des points bonus, atteignez Acme Corp",
    goalNext: "Suivant : {{label}}",
    goalEnd: "Courez vers Acme Corp",
    c_start: "Courez à droite et sautez les trous !",
    faster: "Plus vite !",
    c_trap: "Mauvaise réponse : remontez d'un saut !",
    c_hazard: "Attendez que la croix rouge bouge, puis passez",
    c_fall: "Retour au dernier drapeau : réessayez",
    c_ghost: "Invisible ! Prenez Sales_Manager pour réapparaître",
    c_visible: "De nouveau visible ! Courez vers Acme Corp",
    c_lift: "Montez sur le bouton Edit",
    coachVeg: "Miam ! Les légumes, ce sont des points bonus",
    c_mushroom: "Un champignon ! Mangez-le pour grandir",
    giant: "Cochon d'Inde géant !",
    giantLeft: "Géant {{n}}",
    giantHit: "Aïe ! Retour à la taille normale",
    smashed: "Validation rule écrasée !",
    info_mushroom: "Vous avez manqué le champignon : tapez par en dessous le bloc ? au-dessus d'Object Manager pour devenir géant.",
    note: "Vous avez créé un champ et vous ne le voyez pas ? Personne ne le voit. Accordez-le dans un permission set, jamais un profil, puis regardez un vrai enregistrement avant de dire que c'est fini. - V.",
    path0: "New User Story",
    path1: "Champ et présentation",
    path2: "Permission sets",
    path3: "Page d'enregistrement",
    parts: "Pièces",
    vegetablesCount: "Légumes : {{n}}.",
    invisible: "Invisible",
    q_type: "What type of User Story do you want to create?",
    q_org: "Which Salesforce org do you want to work in?",
    o_fall: "Session expired or invalid",
    o_fall_tip: "Rouvrez l'org depuis Orgs Manager : l'extension utilise l'identifiant qu'elle a gardé, pas de mot de passe, pas de page de connexion.",
    o_fix: "Fix, c'est pour quelque chose de déjà livré",
    o_fix_tip: "US-014 ajoute quelque chose qui n'existait pas : répondez Feature: a new capability or an improvement.",
    o_create: "La commande échoue après une longue attente",
    o_create_tip: "Ne prenez jamais Create new scratch org ici : votre travail va dans votre sandbox de dev, et un Dev Hub qui a atteint sa limite de scratch orgs échoue après une longue attente. Prenez Sandbox org with source tracking.",
    o_profile: "Les profils auraient le champ",
    o_profile_tip: "Décochez Visible pour tous les profils sur l'écran de sécurité au niveau du champ : dans ce projet l'accès passe par un permission set, jamais par un profil.",
    o_valid: "L'enregistrement échoue avec une erreur de règle de validation",
    o_valid_tip: "Une règle de validation de l'org a refusé l'enregistrement. Si vous avez changé une valeur par erreur, remettez une valeur valide avant d'enregistrer à nouveau.",
    o_repEdit: "Laissez Edit Access décoché pour les commerciaux",
    o_repEdit_tip: "Un commercial lit le niveau d'un client, ce sont les responsables commerciaux qui le décident.",
    v_hazard: "Validation rule",
    v_pit: "Session expired or invalid",
    v_ghostSign: "Customer Tier : visible par personne",
    v_orgAlias: "Org · ALIAS",
    v_devSandbox: "Votre sandbox de dev",
    v_openDev: "Ouvrir la sandbox de dev",
    v_profileKeep: "Garder Visible coché pour les profils",
    v_profileClear: "Décocher Visible pour tous les profils",
    m_field: "Créé : le champ Picklist qui montre le niveau de chaque client",
    m_layout: "Mis à jour : met Customer Tier sur la page d'enregistrement Compte",
    m_rep: "Mis à jour : Read Access pour les commerciaux, qui lisent le niveau",
    m_manager: "Mis à jour : Read Access et Edit Access pour les responsables commerciaux, vous compris",
    branch: "git checkout -b features/US-014-customer-tier",
    target: "Branch cible : integration",
    fieldName: "Field Name : Customer_Tier (Salesforce ajoute __c à l'enregistrement)",
    saved: "Customer_Tier__c enregistré",
    ghost: "Customer Tier est invisible pour tout le monde, vous compris",
    ghostTick: "Aucun profil, aucun permission set ne l'accorde encore",
    repRead: "Les commerciaux peuvent le lire. Vous, toujours pas : vous avez Sales Manager",
    mgrRead: "De nouveau visible : Sales Manager vous l'accorde",
    refresh: "Refresh : un essai de plus",
    info_ghost: "Vous avez atteint Acme Corp encore invisible : sans Read Access sur Sales Manager, l'enregistrement ne vous montre rien.",
    info_field: "Vous avez sauté le champ personnalisé : Customer_Tier__c est ce que toute la story construit.",
    info_rep: "Vous avez sauté Sales_Rep : les commerciaux ne voyaient pas le champ.",
    info_layout: "Vous avez sauté Account-Account Layout : c'est ce qui met le champ sur la page d'enregistrement.",
    info_other: "Également manqué : {{list}}.",
    outOfOrder: "{{label}}, dans le désordre : {{first}} vient d'abord",
    done: "Customer Tier sur Acme Corp : {{n}}",
    doneGhost: "Acme Corp ne montre pas Customer Tier : rien ne vous l'accorde",
    veg_fennel: "Fenouil",
    veg_carrot: "Carotte",
    veg_bellPepper: "Poivron",
    veg_cucumber: "Concombre",
    veg_romaine: "Romaine",
    veg_parsley: "Persil",
    c_castle: "Continuez à droite : quelqu'un vous attend sur le pont",
    goalBoss: "Touchez la hache derrière l'admin",
    adminName: "L'admin",
    adminSay: "Halte ! Je construis un Flow monstre, et tout va dedans : US-014, les e-mails, toute l'org !",
    youSay: "Des petits Flows, oui. Le reste en Apex et LWC simples : avec l'agentic engineering, un agent de code les écrit et les teste avec moi.",
    c_axe: "Passez-le et touchez la hache !",
    c_flow: "Sautez les Flows bas, restez au sol sous les hauts",
    c_under: "Il saute : passez dessous !",
    o_flowHit: "Touché par le Flow monstre",
    o_flowHit_tip: "Un Flow qui fait tout est difficile à lire, à tester et à déployer. Sautez les Flows bas, restez au sol sous les hauts.",
    o_admin: "Vous avez percuté l'admin",
    o_admin_tip: "Passez sous lui quand il saute, ou sautez par-dessus en partant un peu avant lui.",
    o_lava: "Dans la lave",
    o_lava_tip: "Restez sur le pont : la hache est tout au bout, derrière l'admin.",
    retryHint: "Réessayer reprend au pont.",
    retryBoss: "Retour direct au pont : le champ est construit",
    scream: "Des Flows, des Flows partouuuuut !",
    bossDown: "Le Flow monstre est tombé avec le pont !",
    info_boss: "Les Flows sont parfaits pour l'automatisation simple. Quand l'un d'eux devient un monstre, mettez la logique en Apex et LWC simples : avec l'agentic engineering, un agent de code les écrit avec vous, tests compris, et vous relisez."
  }
};

/** The strings taken word for word from the labs, checked by scripts/verify/check-easter-egg.mjs. */
export const QUOTES = [
  { lab: "1.3", text: "New User Story" },
  { lab: "1.3", text: "DevOps Pipeline" },
  { lab: "1.3", text: "Automatically selected target branch is integration" },
  { lab: "1.3", text: "What type of User Story do you want to create?" },
  { lab: "1.3", text: "Feature: a new capability or an improvement" },
  { lab: "1.3", text: "Fix: correct something that is broken" },
  { lab: "1.3", text: "What is the name of your new User Story?" },
  { lab: "1.3", text: "Which Salesforce org do you want to work in?" },
  { lab: "1.3", text: "Create new scratch org" },
  { lab: "1.4", text: "Orgs Manager" },
  { lab: "1.4", text: "ALIAS" },
  { lab: "1.4", text: "Fields & Relationships" },
  { lab: "1.4", text: "Field Permissions" },
  { lab: "1.4", text: "Read Access" },
  { lab: "1.4", text: "Edit Access" }
];

/* ---------- How it feels ---------- */

const RUN_SPEED = 6.5;
const GROUND_ACCEL = 60;
const AIR_ACCEL = 34;
const GRAVITY = 30;
const JUMP_SPEED = 12.2;
// Letting go of jump early cuts the rise: short hops and full jumps
const JUMP_CUT = 0.45;
const MAX_FALL = -20;
// Still allowed to jump just after running off an edge, and a press just
// before landing still counts
const COYOTE_S = 0.15;
const BUFFER_S = 0.2;
// A swipe has no release: it moves for this long
const NUDGE_S = 0.35;
// The shortest move of a key or a pad tapped and let go at once
const TAP_S = 0.12;
const FALL_Y = -7;
const HALF_W = 0.5;
const FOOT = 0.38;
const HEIGHT = 0.85;
const STEP_UP = 0.45;
const INVULNERABLE_S = 2;
const PART_RADIUS = 0.85;
const VEGETABLE_RADIUS = 0.75;
const VEGETABLE_HEIGHT = 0.6;
const DEPTH = 2.4;
const TRAP_S = 1.2;
// Edit Access, the temptation above the sales reps' row
const DECOY_X = 138.7;
const DECOY_Y = 7;
const END_X = 161.5;
// The pace: what moves on its own (validation rules, lifts, traps) speeds up
// with the parts taken, up to +35 % at the end, on an ease-in curve. The
// guinea pig's own top speed follows a little (a third of it). A lost attempt
// slows everything down by 15 % for a few seconds
const PACE_GAIN = 0.55;
const PACE_RUN_SHARE = 0.4;
// The share of the parts taken at the gentle pace: the New User Story stage
const PACE_CALM = 0.5;
const MERCY_S = 5;
const MERCY_FACTOR = 0.85;
// How fast the pace may change, per second: never a jump
const PACE_RATE = 0.08;

/* ---------- The castle at the end: the admin on the bridge ---------- */

// After Acme Corp: a stone ledge, the bridge over the lava, and the axe on its
// ledge at the far end, against the castle wall
const CASTLE_X0 = 167.5;
const CASTLE_CAM_X = 163;
const TALK_X = 165.5;
const BOSS_CHECK_X = 169;
const BRIDGE_X0 = 171;
const BRIDGE_SEGMENTS = 16;
const SEGMENT_W = 1.1;
const BRIDGE_X1 = BRIDGE_X0 + BRIDGE_SEGMENTS * SEGMENT_W;
const BRIDGE_TOP = 2;
const BRIDGE_H = 0.45;
const AXE_X = 190.3;
const WALL_X0 = 192.8;
const LAVA_Y = -1.4;
// The admin: a slow patrol round his spot, a Flow thrown every few seconds,
// low (jump it) or high (stay down), a jump now and then. The guinea pig close
// in front of him on the bridge makes him jump: that is the way under him
// His face: a different one of the twenty-one admins at each play, drawn in createWorld
let ADMIN_FACE_URL = adminFaceUrl(1);
const PIG_FACE_URL = new URL("../../../images/guinea-pig-small.webp", import.meta.url).href;
const ADMIN_HOME = 184.2;
const ADMIN_PATROL = 1.2;
const ADMIN_WALK = 0.8;
const ADMIN_HALF_W = 0.6;
// What hits stops at his chin, so a well-timed jump clears him; his face goes higher
const ADMIN_H = 1.95;
const ADMIN_TOP = 2.55;
const ADMIN_NEAR = 4.6;
const ADMIN_CROUCH_S = 0.4;
const ADMIN_JUMP_V = 9;
const ADMIN_GRAVITY = 12;
const ADMIN_FALL_GRAVITY = 6;
const THROW_GAP_S = 2.3;
const WINDUP_S = 0.55;
const FLOW_SPEED = 4.6;
const FLOW_R = 0.33;
const FLOW_LOW = BRIDGE_TOP + 0.42;
const FLOW_HIGH = BRIDGE_TOP + 1.3;
const FLOW_POOL = 4;
const FLOW_TRAIL = 3;
// The talk before the fight: the admin, then the guinea pig, a few seconds each
// The guinea pig answers while the admin's line is still up: both stay until read
// The shortest talk: the guinea pig answers after 4 s, the fight starts at 9 s.
// Longer lines (and languages) get the time to read them; walking onto the
// bridge starts the fight at once.
const TALK_YOU_S = 4;
const TALK_END_S = 9;
// The bridge goes, a segment at a time, from the axe end
const COLLAPSE_WAIT_S = 0.35;
const COLLAPSE_STEP_S = 0.075;
const HANG_S = 0.6;
const FINISH_S = 2;
const BOSS_POINTS = 400;
// Each heart lost in the castle slows him a little, three times at most
const BOSS_EASE = 0.12;
// Out of hearts in the castle: the next try starts there, within this long. Kept
// by the module, which outlives a world (the shell builds a fresh one for each try)
const BOSS_RETRY_MS = 15 * 60000;
let bossRetryAt = 0;

/* ---------- The level, left to right ---------- */

// Each platform: x0, x1, top, look, text, extra. Every one is a solid box.
function levelPlatforms(t) {
  return [
    // New User Story, in the DevOps Pipeline of VS Code
    { x0: -6, x1: 8, top: 0, h: 1.2, look: "vscode", text: "DevOps Pipeline", sub: "Project Contribution Workflow" },
    { x0: 9, x1: 16.5, top: -1, look: "answer", text: "Fix: correct something that is broken", trap: { title: "o_fix", tip: "o_fix_tip", delay: TRAP_S } },
    { x0: 10, x1: 15.5, top: 1.6, h: 0.6, look: "answer", text: "Feature: a new capability or an improvement" },
    { x0: 17.5, x1: 23.5, top: 2.2, look: "input", text: "US-014-customer-tier", sub: "What is the name of your new User Story?" },
    { x0: 24.5, x1: 34, top: 1.2, look: "answer", text: "Create new scratch org", trap: { title: "o_create", tip: "o_create_tip", delay: 1.8 } },
    { x0: 25.5, x1: 30.5, top: 3.8, h: 0.6, look: "answer", text: "Sandbox org with source tracking" },
    { x0: 32.5, x1: 40, top: 3.4, look: "branch", text: "features/US-014-customer-tier" },
    // Orgs Manager: read the ALIAS column, every row is an org
    { x0: 40, x1: 44, top: 2.6, look: "row", text: "integration", sub: t("v_orgAlias") },
    { x0: 44, x1: 47.7, top: 1.8, look: "row", text: "uat", sub: t("v_orgAlias") },
    { x0: 47.7, x1: 53.5, top: 1, look: "row", text: "dev-sandbox", sub: t("v_orgAlias"), hot: true },
    // Setup > Object Manager > Account
    { x0: 55.5, x1: 59, top: 1, look: "card", text: "Setup" },
    { x0: 61.6, x1: 70, top: 1, look: "card", text: "Object Manager" },
    { x0: 70, x1: 74, top: 1.4, look: "card", text: "Account" },
    // The custom field, created
    { x0: 75.5, x1: 84, top: 2.6, look: "meta", text: "Account.Customer_Tier__c", sub: "CustomField", line: "m_field" },
    // Field-level security: the profiles, a trap, or cleared, the right way
    { x0: 85.5, x1: 92.5, top: 1.8, look: "answer", text: t("v_profileKeep"), trap: { title: "o_profile", tip: "o_profile_tip", delay: TRAP_S } },
    { x0: 86.5, x1: 91.5, top: 4, h: 0.6, look: "answer", text: t("v_profileClear") },
    // The page layout, updated, and Save
    { x0: 93.5, x1: 101, top: 3.6, h: 2, look: "meta", text: "Account-Account Layout", sub: "Layout", line: "m_layout" },
    { x0: 103.6, x1: 109, top: 3, look: "button", text: "Save", big: true, save: true },
    // After the twist: the permission sets
    { x0: 110.3, x1: 115.5, top: 2.6, look: "card", text: "Setup > Permission Sets", ghost: true },
    { x0: 115.5, x1: 124, top: 3.4, look: "meta", text: "Sales_Rep", sub: "PermissionSet", line: "m_rep", ghost: true },
    { x0: 125.5, x1: 128.7, top: 2, look: "button", text: "Edit", ghost: true, move: { axis: "y", amp: 2.4, speed: 0.95, lift: true } },
    { x0: 129.8, x1: 138, top: 4.4, look: "fls", text: "Customer Tier", sub: "Field Permissions", faint: true },
    { x0: 139.4, x1: 148, top: 4.4, look: "meta", text: "Sales_Manager", sub: "PermissionSet", line: "m_manager", ghost: true },
    // The record
    { x0: 149.5, x1: 153, top: 2.8, look: "card", text: "App Launcher" },
    { x0: 154.5, x1: CASTLE_X0, top: 2, h: 2.6, look: "record", text: "Acme Corp" },
    // The castle: a stone ledge, the bridge (built apart, it goes down one
    // segment at a time), the axe's ledge and the wall. Nothing hangs over the
    // bridge: a jump over a Flow never hits a ceiling
    { x0: CASTLE_X0, x1: BRIDGE_X0, top: BRIDGE_TOP, h: 6, look: "stone" },
    { x0: BRIDGE_X1, x1: WALL_X0, top: BRIDGE_TOP, h: 6, look: "stone" },
    { x0: WALL_X0, x1: WALL_X0 + 3, top: 10, h: 14, look: "stone" }
  ];
}

// The parts, in the order they must be got. kind: answer (New User Story), org,
// meta (one per metadata the story creates or updates)
function levelParts(t) {
  return [
    { x: 5.5, y: 1.1, label: "New User Story", glyph: "star", color: SLDS.brand, kind: "answer" },
    { x: 13.4, y: 2.6, label: "Feature", glyph: "bolt", color: SLDS.success, kind: "answer" },
    { x: 21, y: 3.2, label: "US-014-customer-tier", sign: "US-014", glyph: "code", color: SLDS.navy, kind: "answer" },
    { x: 28.5, y: 4.8, label: "Sandbox org with source tracking", sign: t("v_devSandbox"), glyph: "org", color: SLDS.teal, kind: "answer" },
    { x: 35, y: 4.4, label: "features/US-014-customer-tier", sign: "Branch", glyph: "branch", color: SLDS.success, kind: "answer", event: "branch" },
    { x: 52.4, y: 2, label: "Open", sign: t("v_openDev"), glyph: "cloud", color: SLDS.brand, kind: "org" },
    { x: 79.75, y: 3.6, label: "CustomField Account.Customer_Tier__c", sign: "Customer_Tier__c", item: "custom-field", glyph: "code", color: SLDS.navy, kind: "meta", line: "m_field", event: "field" },
    { x: 97.25, y: 4.6, label: "Layout Account-Account Layout", sign: "Account Layout", item: "record", glyph: "log", color: SLDS.success, kind: "meta", line: "m_layout", event: "layout" },
    { x: 119.75, y: 4.4, label: "PermissionSet Sales_Rep", sign: "Sales_Rep", item: "permission-set", glyph: "permset", color: SLDS.purple, kind: "meta", line: "m_rep", event: "repRead" },
    { x: 143.7, y: 5.4, label: "PermissionSet Sales_Manager", sign: "Sales_Manager", item: "permission-set", glyph: "permset", color: SLDS.purple, kind: "meta", line: "m_manager", event: "mgrRead" }
  ];
}

// The validation rules: boxes that slide along an axis, slowly enough to time
const HAZARDS = [
  { x: 66.2, y: 1, w: 1.1, h: 1.1, axis: "y", amp: 2.6, speed: 1.6 },
  { x: 102.3, y: 1, w: 1, h: 1, axis: "y", amp: 4, speed: 1.7 },
  { x: 134, y: 4.4, w: 1.1, h: 1, axis: "x", amp: 1, speed: 1.4 },
  { x: 146.2, y: 4.4, w: 1.1, h: 1, axis: "x", amp: 0.8, speed: 1.3 }
];
// A hit counts only when the boxes really overlap: forgiving edges
const HAZARD_MARGIN = 0.15;

// x, y (top of the floor), the step of the Path it belongs to, and the log
// line it writes when passed. The last one is the castle's
const CHECKPOINTS = [
  [0, 0, 0],
  [19.5, 2.2, 0],
  [36, 3.4, 1],
  [50.5, 1, 1],
  [63.5, 1, 1],
  [76.5, 2.6, 1],
  [94.5, 3.6, 1],
  [104.5, 3, 1],
  [111, 2.6, 2],
  [130.5, 4.4, 2],
  [140, 4.4, 2],
  [150, 2.8, 3, "App Launcher > Sales > Accounts"],
  [BOSS_CHECK_X, BRIDGE_TOP, 3]
];
const BOSS_CP = CHECKPOINTS.length - 1;

// The bonus vegetables: x, y of their middle. Their kind follows VEGETABLES in turn
const VEGETABLE_SPOTS = [
  [1.5, 0.9], [2.5, 0.9], [3.5, 0.9], [16.6, 3.2], [17.3, 3.5], [22.5, 3], [24.5, 3.9], [31.5, 4.6],
  [36.5, 4.2], [37.5, 4.2], [38.5, 4.2], [42, 3.4], [46, 2.6], [50, 1.8], [54.5, 2.2], [57.3, 1.8],
  [60.2, 2.6], [60.9, 3], [61.6, 2.6], [64.5, 1.8], [72, 2.2], [74.8, 3.6], [77.4, 3.4], [82.4, 3.4],
  [85, 4.4], [89, 4.8], [92.4, 5], [95, 4.4], [99.6, 4.4], [106.3, 3.8], [110, 3.4], [117.4, 4.2],
  [131.6, 5.2], [137, 5.2], [141.4, 5.2], [146.4, 5.2], [151.2, 3.6], [157, 2.8], [159, 2.8]
];

// The screens behind the platforms: x0, x1, look, eyebrow, title
const SCREENS = [
  [-7, 24, "vscode", "DevOps Pipeline", "New User Story"],
  [24, 40, "vscode", "New User Story", "Sandbox org with source tracking"],
  [40, 55, "vscode", "sfdx-hardis", "Orgs Manager"],
  [55, 74.5, "setup", "Setup", "Object Manager"],
  [74.5, 92.8, "setup", "Setup > Object Manager > Account", "Fields & Relationships"],
  [92.8, 110, "setup", "Account", "Account Layout"],
  [110, 139, "ghost", "Setup > Permission Sets > Sales Rep", "Sales_Rep"],
  [139, 149, "ghost", "Setup > Permission Sets", "Sales_Manager"],
  [149, CASTLE_X0, "record", "Sales · Accounts", "Acme Corp"]
];

export function createWorld(ctx) {
  const { THREE, root, pig, paint, t, hud, engine } = ctx;
  ADMIN_FACE_URL = adminFaceUrl(pickAdmins(1, ctx.random)[0]);
  const camera = ctx.camera;
  const disposables = [];
  const keep = (thing) => {
    disposables.push(thing);
    return thing;
  };

  const unit = paint.geometry("w1-unit", () => new THREE.BoxGeometry(1, 1, 1));
  const plane = paint.geometry("w1-plane", () => new THREE.PlaneGeometry(1, 1));
  const tileGeometry = paint.geometry("w1-tile", () => new THREE.BoxGeometry(0.62, 0.62, 0.12));
  const shadows = engine.settings.shadows;

  /* ---------- Platforms ---------- */

  const tops = {
    vscode: paint.plain(0x3c3c3c, { roughness: 0.8 }),
    light: paint.plain(0xf3f3f3, { roughness: 0.8 }),
    brand: paint.plain(0x0b5cab, { roughness: 0.6 }),
    green: paint.plain(0x2e844a, { roughness: 0.6 }),
    // The castle's stone
    stone: paint.plain(0x6b6573, { roughness: 0.95 })
  };
  const sides = {
    vscode: paint.plain(0x252526, { roughness: 0.8 }),
    light: paint.plain(0xc9c9c9, { roughness: 0.8 }),
    brand: paint.plain(0x014486, { roughness: 0.6 }),
    green: paint.plain(0x22683a, { roughness: 0.6 }),
    stone: paint.plain(0x3f3a46, { roughness: 0.95 })
  };
  // Light platforms: white tops, a cheerful colour on their sides, in turn
  const HAPPY = [0x1b96ff, 0x06a59a, 0x9050e9, 0xfe9339, 0xe3478b, 0x2e844a];
  const happySides = HAPPY.map((c) => paint.plain(c, { roughness: 0.55 }));
  tops.light = paint.plain(0xfafbfd, { roughness: 0.7 });
  const faintSide = keep(new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, depthWrite: false }));

  const platforms = levelPlatforms(t).map((def, i) => buildPlatform(def, i));

  function buildPlatform(def, i) {
    const h = def.h || 0.8;
    const w = def.x1 - def.x0;
    const FAMILIES = { vscode: "vscode", button: "brand", branch: "green", stone: "stone" };
    const family = FAMILIES[def.look] || "light";
    let front;
    let record = null;
    if (def.look === "record") {
      record = recordTexture(w, h);
      front = keep(new THREE.MeshStandardMaterial({ map: record.texture, roughness: 0.6, emissive: 0x111111 }));
    } else {
      front = paint.material("w1-plat-" + i, Math.min(2048, Math.round(w * 110)), Math.round(h * 110), (c, cw, ch) => drawFront(c, cw, ch, def), { emissive: 0x151515 });
    }
    const side = family === "light" ? happySides[i % happySides.length] : sides[family];
    const mesh = new THREE.Mesh(unit, [side, side, tops[family], side, front, side]);
    mesh.scale.set(w, h, DEPTH);
    mesh.position.set(def.x0 + w / 2, def.top - h / 2, 0);
    mesh.castShadow = shadows;
    mesh.receiveShadow = true;
    root.add(mesh);
    const p = Object.assign({}, def, { w, h, mesh, front, record, normal: mesh.material, bx0: def.x0, btop: def.top, dx: 0, dy: 0, gone: false, timer: 0, fallV: 0 });
    if (def.faint) {
      front.transparent = true;
      front.opacity = 0.3;
      front.depthWrite = false;
      mesh.material = [faintSide, faintSide, faintSide, faintSide, front, faintSide];
      mesh.castShadow = false;
    }
    return p;
  }

  function revealFaint() {
    for (const p of platforms) {
      if (p.faint) {
        p.front.transparent = false;
        p.front.opacity = 1;
        p.front.depthWrite = true;
        p.front.needsUpdate = true;
        const side = happySides[platforms.indexOf(p) % happySides.length];
        p.mesh.material = [side, side, tops.light, side, p.front, side];
        p.mesh.castShadow = shadows;
      }
    }
  }

  const lift = platforms.find((p) => p.move && p.move.lift);
  const recordPlatform = platforms.find((p) => p.record);
  const savePlatform = platforms.find((p) => p.save);

  /** An item of the course, centred on its middle, or the world's own shape if the pack did not load. */
  function itemOr(name, height, fallback) {
    const item = ctx.models.get(name, { height, shadows: false });
    if (!item) {
      return fallback();
    }
    item.position.y = -height / 2;
    const holder = new THREE.Group();
    holder.add(item);
    return holder;
  }

  // The account Acme Corp, and the Cloudity mark at the very end, on top of the castle wall
  {
    const record = ctx.models.get("record", { height: 1.3 });
    if (record) {
      record.position.set(160.1, recordPlatform.top, -0.9);
      root.add(record);
    }
    const logo = ctx.models.get("cloudity-logo", { height: 1.8 });
    if (logo) {
      logo.position.set(WALL_X0 + 1.5, 10, 0);
      root.add(logo);
    }
  }

  /* ---------- Parts, vegetables, hazards, checkpoints ---------- */

  const parts = levelParts(t).map((def, i) => {
    const group = new THREE.Group();
    group.position.set(def.x, def.y, 0.2);
    const tileMaterial = paint.material("w1-part-tile-" + i, 128, 128, (c, w, h) => {
      rounded(c, 2, 2, w - 4, h - 4, 22);
      c.fillStyle = def.color;
      c.fill();
      glyph(c, def.glyph, w / 2, h / 2, w * 0.9);
    }, { transparent: true, emissive: 0x202020, roughness: 0.35 });
    const edge = paint.plain(new THREE.Color(def.color).getHex(), { roughness: 0.35 });
    const meta = def.kind === "meta";
    const size = meta ? 0.85 : 0.7;
    let tile = ctx.models.get(partItem(def), { height: size, shadows: false });
    if (tile) {
      tile.position.y = -size / 2;
      const holder = new THREE.Group();
      holder.add(tile);
      tile = holder;
    } else {
      tile = pictureBox(THREE, tileGeometry, tileMaterial, edge);
    }
    group.add(tile);
    // A few words that face the camera; the whole label is in the goal line
    const label = paint.sign("w1-part-" + i, def.sign || def.label, { color: def.color, height: 0.6 });
    const labelMaterial = label.material;
    label.position.set(0, meta ? 0.95 : 0.8, 0.3);
    group.add(label);
    root.add(group);
    return Object.assign({}, def, { index: i, group, tile, tileMaterial, labelMaterial, done: false, flying: 0 });
  });
  const totalParts = parts.length;

  // The ring round the part to get next
  const halo = new THREE.Mesh(
    paint.geometry("w1-halo", () => new THREE.TorusGeometry(0.55, 0.06, 8, 40)),
    paint.plain(0xffd24a, { emissive: 0xffb020, emissiveIntensity: 2.2, roughness: 0.3 })
  );
  root.add(halo);

  // The mushrooms. A ? block is solid, as a platform is: bumped from below, it
  // lets its mushroom out
  const blockFront = paint.material("w1-block", 128, 128, (c, w, h) => drawBlock(c, w, h, false), { emissive: 0x3a2400, roughness: 0.35 });
  const blockUsed = paint.material("w1-block-used", 128, 128, (c, w, h) => drawBlock(c, w, h, true), { roughness: 0.7 });
  const blockSide = paint.plain(0xe8a317, { roughness: 0.4, emissive: 0x2a1800 });
  const blockSideUsed = paint.plain(0x9c6b3a, { roughness: 0.8 });
  const mushrooms = MUSHROOMS.map((def) => {
    const group = new THREE.Group();
    group.add(itemOr("mushroom", MUSHROOM_HEIGHT, () => mushroomShape()));
    root.add(group);
    const m = Object.assign({}, def, { group, state: "ready", t: 0, block: null });
    if (def.block) {
      const b = def.block;
      const w = b.x1 - b.x0;
      const mesh = new THREE.Mesh(unit, [blockSide, blockSide, blockFront, blockSide, blockFront, blockSide]);
      mesh.scale.set(w, w, w);
      mesh.position.set(b.x0 + w / 2, b.bottom + w / 2, 0);
      mesh.castShadow = shadows;
      root.add(mesh);
      const block = { x0: b.x0, x1: b.x1, top: b.bottom + w, h: w, w, mesh, look: "block", mushroom: m, used: false, bump: 0, bx0: b.x0, btop: b.bottom + w, dx: 0, dy: 0, gone: false, timer: 0, fallV: 0 };
      platforms.push(block);
      m.block = block;
      m.state = "hidden";
      m.x = (b.x0 + b.x1) / 2;
      m.y = b.bottom + w / 2;
      group.visible = false;
    }
    group.position.set(m.x, m.y, 0.2);
    return m;
  });

  // The bonus vegetables: one InstancedMesh per mesh of each kind's model, the
  // way the runner draws them in world 0. An eaten one shrinks to nothing
  const vegetables = VEGETABLE_SPOTS.map(([x, y], i) => ({ x, y, kind: VEGETABLES[i % VEGETABLES.length], slot: 0, done: false, label: null }));
  const vegetablePools = {};
  for (const kind of VEGETABLES) {
    const list = vegetables.filter((v) => v.kind === kind);
    list.forEach((v, i) => {
      v.slot = i;
    });
    const pool = [];
    const copy = ctx.models.get(VEGETABLE_MODELS[kind], { height: VEGETABLE_HEIGHT, shadows: false });
    if (copy) {
      copy.updateMatrixWorld(true);
      copy.traverse((child) => {
        if (child.isMesh) {
          const material = keep(child.material.clone());
          material.emissive = new THREE.Color(VEGETABLE_COLORS[kind]);
          material.emissiveIntensity = 0.3;
          const mesh = new THREE.InstancedMesh(child.geometry, material, list.length);
          // The instances move every frame: a bounding sphere computed once would cull them wrongly
          mesh.frustumCulled = false;
          root.add(mesh);
          pool.push({ mesh, local: child.matrixWorld.clone(), lift: 0 });
        }
      });
    } else {
      const mesh = new THREE.InstancedMesh(tileGeometry, paint.tile("w1-veg-" + kind, VEGETABLE_COLORS[kind], "star"), list.length);
      mesh.frustumCulled = false;
      root.add(mesh);
      // The tile is centred on its middle, a model stands on its base
      pool.push({ mesh, local: new THREE.Matrix4().makeTranslation(0, VEGETABLE_HEIGHT / 2, 0), lift: 0 });
    }
    vegetablePools[kind] = pool;
    // A vegetable's name shows on the first one of its kind only
    const first = list[0];
    if (first) {
      first.label = paint.sign("w1-veg-" + kind, t("veg_" + kind), { color: VEGETABLE_COLORS[kind], height: 0.42 });
      // One kind in two a little higher: the first vegetables come close together
      first.label.position.set(first.x, first.y + 0.62 + (VEGETABLES.indexOf(kind) % 2) * 0.5, 0.3);
      root.add(first.label);
    }
  }
  const eatenKinds = new Set();
  let eaten = 0;
  let vegTold = false;

  const hazardFront = paint.material("w1-hazard", 256, 256, (c, w, h) => {
    rounded(c, 4, 4, w - 8, h - 8, 26);
    c.fillStyle = SLDS.error;
    c.fill();
    c.beginPath();
    c.arc(w / 2, h / 2, w * 0.3, 0, Math.PI * 2);
    c.strokeStyle = SLDS.white;
    c.lineWidth = 9;
    c.stroke();
    glyph(c, "error", w / 2, h / 2, w * 0.55);
    c.fillStyle = SLDS.white;
    c.textAlign = "center";
    c.textBaseline = "middle";
  }, { emissive: 0x3a0008 });
  const hazardSide = paint.plain(0xba0517, { roughness: 0.5 });
  const hazards = HAZARDS.map((def) => {
    const mesh = new THREE.Group();
    let box = ctx.models.get("check-fail", { height: def.h });
    if (box) {
      box.position.y = -def.h / 2;
    } else {
      box = new THREE.Mesh(unit, [hazardSide, hazardSide, hazardSide, hazardSide, hazardFront, hazardSide]);
      box.scale.set(def.w, def.h, 1.2);
      box.castShadow = shadows;
    }
    const label = paint.sign("w1-hazard", t("v_hazard"), { color: SLDS.error, glyph: "error", height: 0.5 });
    label.position.y = def.h / 2 + 0.45;
    mesh.add(box, label);
    root.add(mesh);
    return Object.assign({}, def, { mesh, cx: def.x, bottom: def.y, smashed: false });
  });

  const flagGrey = paint.plain(0xc9c9c9);
  const flagGreen = paint.plain(0x2e844a, { emissive: 0x0b3a1a });
  const poleMaterial = paint.plain(0x706e6b);
  const poleGeometry = paint.geometry("w1-pole", () => new THREE.CylinderGeometry(0.05, 0.05, 1.6, 8));
  const checkpoints = CHECKPOINTS.map(([x, y, path], i) => {
    const group = new THREE.Group();
    group.position.set(x, y, -0.9);
    const flag = new THREE.Mesh(plane, i === 0 ? flagGreen : flagGrey);
    flag.scale.set(0.6, 0.38, 1);
    flag.position.set(0.32, 1.38, 0);
    let star = null;
    const model = i > 0 ? ctx.models.get("flag", { height: 1.7, shadows: false }) : null;
    if (model) {
      group.add(model);
      // Passed: a star turns above the flag
      star = ctx.models.get("check-pass", { height: 0.5, shadows: false });
      if (star) {
        star.position.y = 1.95;
        star.visible = false;
        group.add(star);
      }
    } else if (i > 0) {
      const pole = new THREE.Mesh(poleGeometry, poleMaterial);
      pole.position.y = 0.8;
      group.add(pole, flag);
    }
    root.add(group);
    return { x, y, path, flag, star, group };
  });

  /* ---------- Signs, screens, decor ---------- */

  function sign(text, x, y, width, style) {
    const s = Object.assign({ bg: SLDS.navy, fg: SLDS.white, size: 46 }, style);
    const mesh = new THREE.Mesh(plane, paint.label("w1-sign-" + text + x, text, { width: Math.round(width * 110), height: 80, size: s.size, bg: s.bg, fg: s.fg }));
    mesh.scale.set(width, 0.72, 1);
    mesh.position.set(x, y, -1.3);
    root.add(mesh);
    return mesh;
  }
  sign("Automatically selected target branch is integration", 4.5, 3.4, 7.4, { bg: SLDS.white, fg: SLDS.navy, size: 40 });
  sign(t("q_type"), 12.8, 4.2, 6.2, { size: 38 });
  sign(t("q_org"), 28.5, 6.2, 6.2, { size: 38 });
  for (const x of [54.5, 60.3, 102.3]) {
    sign(t("v_pit"), x, -1.6, 3.2, { bg: SLDS.error, size: 40 });
  }
  // Above each metadata, what it does for the story
  for (const p of platforms) {
    if (p.line) {
      sign(t(p.line), (p.x0 + p.x1) / 2, p.top + 2.75, Math.min(8.2, p.w + 0.4), { bg: SLDS.white, fg: SLDS.navy, size: 34 });
    }
  }
  const ghostSign = sign(t("v_ghostSign"), 106.3, 6.6, 5.6, { bg: SLDS.purple, size: 42 });
  ghostSign.visible = false;

  for (const [x0, x1, look, eyebrow, title] of SCREENS) {
    const w = x1 - x0;
    const h = 7;
    const mesh = new THREE.Mesh(
      plane,
      paint.material("w1-screen-" + x0, Math.min(2048, Math.round(w * 64)), Math.round(h * 64), (c, cw, ch) => drawScreen(c, cw, ch, look, eyebrow, title), {
        emissive: look === "vscode" ? 0x000000 : 0x1a1a1a,
        roughness: 0.9
      })
    );
    mesh.scale.set(w, h, 1);
    mesh.position.set(x0 + w / 2, 3.4, -3.4);
    root.add(mesh);
  }

  // Clouds far below: the drop under every pit
  const puffCount = 46;
  const clouds = new THREE.InstancedMesh(paint.geometry("w1-cloud", () => new THREE.SphereGeometry(1, 12, 8)), paint.plain(0xffffff, { roughness: 1 }), puffCount);
  {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    let seed = 11;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < puffCount; i++) {
      p.set(-10 + i * 5.6 + rnd() * 3, -6.5 - rnd() * 2.5, -2 - rnd() * 6);
      const r = 1.6 + rnd() * 1.8;
      s.set(r * 1.4, r * 0.7, r);
      m.compose(p, q, s);
      clouds.setMatrixAt(i, m);
    }
  }
  root.add(clouds);

  // A cartoon land around the screens: floating grass islands with trees far
  // behind, and a few flowers on the back edge of the panels. Decor only: it
  // never touches the guinea pig
  const decor = [];
  {
    let seed = 5;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const TREES = ["tree_oak", "tree_default", "tree_pineRoundA", "tree_fat", "tree_cone"];
    for (let x = -8; x < 245; x += 11 + rnd() * 5) {
      const z = -12 - rnd() * 4;
      const top = -3.2 - rnd() * 1.8;
      const island = ctx.models.get("block-grass-large", { width: 4 + rnd() * 2, shadows: false });
      if (!island) {
        break;
      }
      island.position.set(x, top - new THREE.Box3().setFromObject(island).max.y, z);
      root.add(island);
      const tree = ctx.models.get(TREES[Math.floor(rnd() * TREES.length)], { height: 3.2 + rnd() * 1.6, shadows: false });
      if (tree) {
        tree.position.set(x - 0.6 + rnd() * 1.2, top, z);
        tree.rotation.y = rnd() * Math.PI * 2;
        root.add(tree);
      }
      const bush = ctx.models.get(rnd() < 0.5 ? "plant_bushLarge" : "plant_bush", { height: 0.8, shadows: false });
      if (bush) {
        bush.position.set(x + 1.2, top, z + 0.6);
        root.add(bush);
      }
      decor.push(island);
    }
  }

  // The puff of dust on landing
  const dustMaterial = keep(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
  const dust = new THREE.Mesh(paint.geometry("w1-dust", () => new THREE.RingGeometry(0.3, 0.55, 24)), dustMaterial);
  dust.rotation.x = -Math.PI / 2;
  root.add(dust);
  let dustTime = 0;

  /* ---------- The HUD line ---------- */

  const bar = document.createElement("div");
  bar.className = "gr-w1-bar";
  const partsNode = document.createElement("span");
  partsNode.className = "gr-w1-count";
  const vegNode = document.createElement("span");
  vegNode.className = "gr-w1-veg";
  const ghostNode = document.createElement("span");
  ghostNode.className = "gr-w1-ghost";
  ghostNode.textContent = t("invisible");
  ghostNode.hidden = true;
  const giantNode = document.createElement("span");
  giantNode.className = "gr-w1-giant";
  giantNode.hidden = true;
  bar.append(partsNode, vegNode, ghostNode, giantNode);
  hud.extra.appendChild(bar);

  /* ---------- State ---------- */

  const player = { x: 0, y: 0, vx: 0, vy: 0, grounded: true, ground: null, coyote: 0, buffer: 0, facing: 1, turn: -Math.PI / 2, inv: 0, lock: 0, squash: 0, cut: false, hit: 0 };
  const held = { left: false, right: false, jump: false };
  const nudge = { left: 0, right: 0 };
  let nextPart = 0;
  let checkpoint = 0;
  let pathIndex = -1;
  let ghost = false;
  let trapFalling = null;
  // The trap the guinea pig last stood on: a fall that starts there is that wrong answer
  let trapStood = null;
  let decoyDone = false;
  let refreshes = [];
  let ending = 0;
  let shake = 0;
  let saved = false;
  let note = null;
  let twistAt = 0;
  let pace = 1;
  let mercy = 0;
  let pacedStage = 0;
  let lastGoal = "";
  let coachAt = -10;
  const coached = new Set();
  // The power-up: k goes from 0 (normal) to 1 (giant) over GROW_S, size follows it
  const giant = { k: 0, size: 1, left: 0, want: 0, eaten: 0, smashed: 0, shrinking: false, on: false };
  // The shadow is the shell's: it is drawn after the world, so it is scaled up here once it is
  const shellAnimate = pig.animate;
  pig.animate = (dt, state) => {
    shellAnimate.call(pig, dt, state);
    if (giant.size !== 1) {
      pig.shadow.scale.x *= giant.size;
      pig.shadow.scale.y *= giant.size;
    }
  };

  const decoy = (() => {
    const group = new THREE.Group();
    group.position.set(DECOY_X, DECOY_Y, 0.2);
    const tile = itemOr("permission-set", 0.7, () => pictureBox(THREE, tileGeometry, paint.tile("w1-decoy", SLDS.success, "code"), paint.plain(0x2e844a)));
    group.add(tile);
    const label = paint.sign("w1-decoy", "Edit Access", { color: SLDS.success, height: 0.55 });
    label.position.y = 0.8;
    group.add(label);
    root.add(group);
    return group;
  })();

  refreshes = [
    [112.8, 5.4],
    [148.75, 6.2]
  ].map(([x, y]) => {
    const group = new THREE.Group();
    group.position.set(x, y, 0.2);
    // Refresh: an org that answers again, one more attempt
    group.add(itemOr("org-cloud", 0.7, () => pictureBox(THREE, tileGeometry, paint.tile("w1-refresh", SLDS.brand, "loop"), paint.plain(0x0176d3))));
    const label = paint.sign("w1-refresh", "Refresh", { color: SLDS.brand, glyph: "loop", height: 0.55 });
    label.position.y = 0.8;
    group.add(label);
    root.add(group);
    return { x, y, group, done: false };
  });

  // Victor's note: high above the right answer on the profiles, a full jump up
  {
    const group = new THREE.Group();
    group.position.set(89, 7.4, 0.2);
    group.add(itemOr("note", 0.75, () => pictureBox(THREE, tileGeometry, paint.tile("w1-note", "#F2C94C", "note"), paint.plain(0xf2c94c))));
    root.add(group);
    note = { x: 89, y: 7.4, group, done: false };
  }

  /* ---------- The castle: the bridge, the lava, the admin and his monster Flow ---------- */

  const cm = new THREE.Matrix4();
  const cq = new THREE.Quaternion();
  const ce = new THREE.Euler();
  const cs = new THREE.Vector3();
  const cp = new THREE.Vector3();
  let disposed = false;

  // The bridge is solid as one platform; it is drawn as segments, so it goes
  // down one segment at a time from the axe end, the SNES way
  const bridge = { x0: BRIDGE_X0, x1: BRIDGE_X1, top: BRIDGE_TOP, h: BRIDGE_H, w: BRIDGE_X1 - BRIDGE_X0, look: "bridge", bx0: BRIDGE_X0, btop: BRIDGE_TOP, dx: 0, dy: 0, gone: false, timer: 0, fallV: 0 };
  platforms.push(bridge);
  const segmentMesh = keep(
    new THREE.InstancedMesh(
      paint.geometry("w1-segment", () => new THREE.BoxGeometry(SEGMENT_W - 0.06, BRIDGE_H, 1.7)),
      paint.material("w1-plank", 128, 64, drawPlank, { roughness: 0.85, emissive: 0x1c0e04 }),
      BRIDGE_SEGMENTS
    )
  );
  segmentMesh.castShadow = shadows;
  segmentMesh.receiveShadow = true;
  segmentMesh.frustumCulled = false;
  root.add(segmentMesh);
  const segments = [];
  for (let i = 0; i < BRIDGE_SEGMENTS; i++) {
    segments.push({ x: BRIDGE_X0 + (i + 0.5) * SEGMENT_W, y: BRIDGE_TOP - BRIDGE_H / 2, vy: 0, spin: 0, turn: 0, falling: false });
  }
  const collapse = { wait: 0, left: BRIDGE_SEGMENTS, moving: false };
  placeSegments(0);

  // The chain from the axe's post to the end of the bridge: the axe cuts it
  const chain = (() => {
    const from = new THREE.Vector3(AXE_X - 0.1, BRIDGE_TOP + 1.3, 0.72);
    const to = new THREE.Vector3(BRIDGE_X1 - 1.6, BRIDGE_TOP + 0.02, 0.72);
    const length = from.distanceTo(to);
    const mesh = new THREE.Mesh(paint.geometry("w1-chain", () => new THREE.CylinderGeometry(0.045, 0.045, 1, 6)), paint.plain(0x2b2b33, { roughness: 0.4, metalness: 0.6 }));
    mesh.scale.set(1, length, 1);
    mesh.position.copy(from).add(to).multiplyScalar(0.5);
    mesh.rotation.z = Math.atan2(to.y - from.y, to.x - from.x) - Math.PI / 2;
    root.add(mesh);
    return mesh;
  })();

  // The axe on its post, gold and silver, turning a little: the end of the world
  const axe = (() => {
    const group = new THREE.Group();
    group.position.set(AXE_X, BRIDGE_TOP, 0.15);
    const wood = paint.plain(0x6b4423, { roughness: 0.7 });
    const post = new THREE.Mesh(paint.geometry("w1-axe-post", () => new THREE.CylinderGeometry(0.08, 0.1, 1.0, 10)), wood);
    post.position.y = 0.5;
    const tool = new THREE.Group();
    tool.position.y = 1.05;
    const handle = new THREE.Mesh(unit, wood);
    handle.scale.set(0.11, 0.95, 0.11);
    handle.position.y = 0.42;
    const blade = new THREE.Mesh(
      paint.geometry("w1-axe-blade", () => {
        const shape = new THREE.Shape();
        shape.moveTo(0, -0.26);
        shape.quadraticCurveTo(0.46, -0.42, 0.52, 0);
        shape.quadraticCurveTo(0.46, 0.42, 0, 0.26);
        shape.lineTo(0, -0.26);
        const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.09, bevelEnabled: false });
        geometry.translate(0, 0, -0.045);
        return geometry;
      }),
      paint.plain(0xdfe5ec, { roughness: 0.25, metalness: 0.65, emissive: 0x3a3f48 })
    );
    blade.position.set(0.05, 0.72, 0);
    const back = new THREE.Mesh(unit, paint.plain(0xffc72c, { roughness: 0.35, metalness: 0.5, emissive: 0x4a3200 }));
    back.scale.set(0.18, 0.3, 0.12);
    back.position.set(-0.08, 0.72, 0);
    tool.add(handle, blade, back);
    group.add(post, tool);
    group.scale.setScalar(1.35);
    group.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = shadows;
      }
    });
    root.add(group);
    return { group, tool, gone: 0 };
  })();

  // The lava: a glowing sea under the bridge, slowly moving, a few bubbles
  const lavaTexture = paint.texture("w1-lava", 256, 256, drawLava);
  lavaTexture.wrapS = THREE.RepeatWrapping;
  lavaTexture.wrapT = THREE.RepeatWrapping;
  lavaTexture.repeat.set(9, 3.5);
  lavaTexture.needsUpdate = true;
  const lava = new THREE.Mesh(plane, keep(new THREE.MeshBasicMaterial({ map: lavaTexture, toneMapped: false, fog: false })));
  lava.rotation.x = -Math.PI / 2;
  lava.scale.set(WALL_X0 - CASTLE_X0 + 4, 10, 1);
  lava.position.set((CASTLE_X0 + WALL_X0) / 2, LAVA_Y, -1);
  root.add(lava);
  const glowMaterial = keep(
    new THREE.MeshBasicMaterial({ map: paint.texture("w1-lava-glow", 8, 128, drawGlow), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false })
  );
  const glow = new THREE.Mesh(plane, glowMaterial);
  glow.scale.set(BRIDGE_X1 - BRIDGE_X0 + 2, 4.2, 1);
  glow.position.set((BRIDGE_X0 + BRIDGE_X1) / 2, LAVA_Y + 2.1, -1.6);
  root.add(glow);
  const bubbleCount = 7;
  const bubbles = keep(new THREE.InstancedMesh(paint.geometry("w1-bubble", () => new THREE.SphereGeometry(0.2, 10, 6)), paint.plain(0xffb020, { emissive: 0xff6a00, emissiveIntensity: 1.6 }), bubbleCount));
  bubbles.frustumCulled = false;
  // Placed once the guinea pig comes near: none at the start of the world
  bubbles.count = 0;
  root.add(bubbles);

  // The castle wall behind, its battlements against a darkening sky, two torches
  const brickTexture = paint.texture("w1-bricks", 256, 256, (c, w, h) => drawBricks(c, w, h, 64));
  brickTexture.wrapS = THREE.RepeatWrapping;
  brickTexture.wrapT = THREE.RepeatWrapping;
  brickTexture.repeat.set(11, 4);
  brickTexture.needsUpdate = true;
  const wall = new THREE.Mesh(plane, keep(new THREE.MeshStandardMaterial({ map: brickTexture, color: 0x9a92a6, roughness: 1, emissive: 0x150d18 })));
  wall.scale.set(44, 16, 1);
  wall.position.set(185, 4, -4.8);
  root.add(wall);
  const merlonCount = 20;
  const merlons = keep(new THREE.InstancedMesh(unit, paint.plain(0x4a4452, { roughness: 1 }), merlonCount));
  for (let i = 0; i < merlonCount; i++) {
    cp.set(163.6 + i * 2.2, 12.55, -4.8);
    cs.set(1.2, 1.1, 0.7);
    cm.compose(cp, cq.identity(), cs);
    merlons.setMatrixAt(i, cm);
  }
  root.add(merlons);
  const darkSky = new THREE.Mesh(plane, keep(new THREE.MeshBasicMaterial({ map: paint.texture("w1-dark-sky", 256, 64, drawDarkSky), transparent: true, depthWrite: false, fog: false, toneMapped: false })));
  darkSky.scale.set(150, 130, 1);
  darkSky.position.set(212, 20, -45);
  darkSky.renderOrder = -1;
  root.add(darkSky);
  const flameMaterial = keep(new THREE.SpriteMaterial({ map: paint.texture("w1-flame", 64, 128, drawFlame), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  const torches = [166.6, 191.4].map((x) => {
    const bracket = new THREE.Mesh(unit, paint.plain(0x2b2b33, { metalness: 0.5, roughness: 0.5 }));
    bracket.scale.set(0.18, 0.5, 0.18);
    bracket.position.set(x, 4.6, -4.6);
    const flame = new THREE.Sprite(flameMaterial);
    flame.position.set(x, 5.2, -4.5);
    flame.scale.set(0.55, 0.9, 1);
    root.add(bracket, flame);
    return flame;
  });
  // His monster Flow, open in Flow Builder on the wall
  const monster = new THREE.Mesh(plane, paint.material("w1-monster-flow", 1024, 560, drawMonsterFlow, { emissive: 0x2a2a2a, roughness: 0.9 }));
  monster.scale.set(12.4, 6.8, 1);
  monster.position.set(180.6, 7.6, -4.5);
  root.add(monster);

  // The admin: a big body, his cartoon face, a Flow on his hoodie
  const admin = buildAdmin();
  const adminSign = paint.sign("w1-admin", "Admin", { color: SLDS.error, glyph: "flow", height: 0.5 });
  admin.group.add(adminSign);
  adminSign.position.set(0, ADMIN_TOP + 0.4, 0.3);

  // His Flows: the Flow icon in a red ring, with flames, and a trail
  const flowMaterial = keep(new THREE.MeshBasicMaterial({ map: paint.texture("w1-flow-ball", 128, 128, drawFlowBall), alphaTest: 0.35, toneMapped: false, fog: false }));
  const flowGeometry = paint.geometry("w1-flow-ball", () => new THREE.CircleGeometry(FLOW_R * 1.45, 28));
  const flowMesh = keep(new THREE.InstancedMesh(flowGeometry, flowMaterial, FLOW_POOL * (1 + FLOW_TRAIL)));
  flowMesh.frustumCulled = false;
  flowMesh.count = 0;
  root.add(flowMesh);
  const flows = [];
  for (let i = 0; i < FLOW_POOL; i++) {
    flows.push({ live: false, x: 0, y: 0, vx: 0, age: 0, high: false });
  }
  // The one in his hand, growing while he winds up: where it will fly, low or high
  const heldFlow = new THREE.Mesh(flowGeometry, flowMaterial);
  heldFlow.visible = false;
  root.add(heldFlow);

  // What he screams as he falls: a comic bubble that follows him down
  const screamMaterial = keep(new THREE.SpriteMaterial({ map: paint.texture("w1-scream", 512, 232, (c, w, h) => drawScream(c, w, h, t("scream"))), transparent: true, depthWrite: false, toneMapped: false }));
  const screamBubble = new THREE.Sprite(screamMaterial);
  screamBubble.scale.set(4.6, 2.08, 1);
  screamBubble.renderOrder = 3;
  screamBubble.visible = false;
  root.add(screamBubble);

  // The prize, after the fall: simple Apex and LWC rise above the axe's ledge
  const prizes = ["apex", "lwc"].map((name, i) => {
    const item = itemOr(name, 0.75, () => pictureBox(THREE, tileGeometry, paint.tile("w1-prize-" + name, i ? "#FFC72C" : "#9050E9", i ? "bolt" : "apex"), paint.plain(i ? 0xd99a00 : 0x6b2fc0)));
    item.visible = false;
    root.add(item);
    return { item, x: BRIDGE_X1 + 0.8 + i * 1.3, t: -1 };
  });

  // The two lines before the fight, as chat bubbles: who speaks, a face, the words
  const talk = document.createElement("div");
  talk.className = "gr-w1-talk";
  hud.layer.appendChild(talk);
  // Each line stays its own reading time: { node, left } in the order they were said
  const talkLines = [];

  const boss = {
    phase: "wait",
    state: "stand",
    t: 0,
    youAt: TALK_YOU_S,
    endAt: TALK_END_S,
    x: ADMIN_HOME,
    y: BRIDGE_TOP,
    vy: 0,
    facing: -1,
    dir: -1,
    lean: 0,
    nextThrow: 1,
    nextJump: 5,
    jumpIn: -1,
    cooldown: 0,
    calm: 0,
    high: false,
    lastHigh: false,
    thrown: 0,
    jumps: 0,
    losses: 0,
    saidYou: false,
    splashed: false,
    downAt: 0,
    retry: false
  };
  // When Acme Corp showed its Customer Tier (the last lesson), and the world clock
  let recordAt = 0;
  let clock = 0;
  let autoplay = false;
  let overHim = false;
  let overJump = false;
  const castle = { k: 0 };

  // The check plays the castle by itself, and loses a heart the way a hit there
  // does (window.__guineaRun only exists for checks)
  const hooks = {
    // true: under him while he jumps; "over": right over him while he stands
    autoplay(on) {
      autoplay = on !== false;
      overHim = on === "over";
    },
    lose() {
      if (ctx.playing) {
        loseOne("o_flowHit", "o_flowHit_tip");
      }
    }
  };
  if (window.__guineaRun) {
    window.__guineaRun.w1 = hooks;
  }

  /* ---------- Starting further down (guinea-at, for checks) ---------- */

  // Out of hearts in the castle a moment ago: this try starts at the bridge
  const retryBoss = bossRetryAt > 0 && Date.now() - bossRetryAt < BOSS_RETRY_MS && (ctx.params.startAt || 0) < BOSS_CHECK_X;
  bossRetryAt = 0;
  const startAt = retryBoss ? BOSS_CHECK_X : ctx.params.startAt || 0;
  MUSIC = startAt >= BOSS_CHECK_X ? "1-castle" : 1;
  if (startAt > 0) {
    for (let i = CHECKPOINTS.length - 1; i >= 0; i--) {
      if (CHECKPOINTS[i][0] <= startAt) {
        checkpoint = i;
        break;
      }
    }
    const cx = checkpoints[checkpoint].x;
    for (const part of parts) {
      if (cx > savePlatform.x1 && !saved && part.x > savePlatform.x1) {
        saved = true;
        setGhost(true);
        ghostSign.visible = true;
      }
      if (part.x < cx) {
        part.done = true;
        part.group.visible = false;
        nextPart = part.index + 1;
        if (part.event === "repRead") {
          revealFaint();
        } else if (part.event === "mgrRead") {
          setGhost(false);
        }
      }
    }
    for (const v of vegetables) {
      if (v.x < cx) {
        v.done = true;
        if (v.label) {
          v.label.visible = false;
        }
      }
    }
    player.x = cx;
    player.y = checkpoints[checkpoint].y;
    if (cx > END_X) {
      // Acme Corp already shows its Customer Tier: the castle is next
      recordAt = -1;
      boss.retry = retryBoss;
      castle.k = 1;
    }
  }
  for (let i = 0; i <= checkpoint; i++) {
    checkpoints[i].flag.material = flagGreen;
    if (checkpoints[i].star) {
      checkpoints[i].star.visible = true;
    }
  }

  /* ---------- Input: held keys and pads, on top of the shell's actions ---------- */

  const overlay = hud.layer.parentElement;
  const KEYS = { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", ArrowUp: "jump", KeyW: "jump", Space: "jump" };
  const pointers = new Map();
  // A jump pressed on a key or a pad can be cut short; a tap has no release
  let heldPress = false;
  const pressedAt = { left: 0, right: 0 };

  function press(name, down) {
    held[name] = down;
    if (name === "jump" && down) {
      heldPress = true;
    }
    if (name !== "jump") {
      // Let go: it stops, but a quick tap still moves a little
      if (down) {
        pressedAt[name] = engine.time;
      } else {
        nudge[name] = Math.max(0, TAP_S - (engine.time - (pressedAt[name] || 0)));
      }
    } else if (!down) {
      player.cut = true;
    }
  }
  function onKey(event) {
    const name = KEYS[event.code];
    if (!name || event.repeat) {
      return;
    }
    press(name, event.type === "keydown");
  }
  function onPadDown(event) {
    const pad = event.target.closest ? event.target.closest("[data-pad]") : null;
    const name = pad ? pad.getAttribute("data-pad") : null;
    if (name && held[name] !== undefined) {
      pointers.set(event.pointerId, name);
      press(name, true);
    }
  }
  function onPadUp(event) {
    const name = pointers.get(event.pointerId);
    if (name) {
      pointers.delete(event.pointerId);
      press(name, false);
    }
  }
  function releaseAll() {
    for (const name of Object.keys(held)) {
      held[name] = false;
    }
    nudge.left = 0;
    nudge.right = 0;
    pointers.clear();
  }
  window.addEventListener("keydown", onKey, true);
  window.addEventListener("keyup", onKey, true);
  window.addEventListener("blur", releaseAll);
  overlay.addEventListener("pointerdown", onPadDown, true);
  window.addEventListener("pointerup", onPadUp, true);
  window.addEventListener("pointercancel", onPadUp, true);

  /* ---------- The rules ---------- */

  function setGhost(on) {
    ghost = on;
    pig.setGhost(on);
    ghostNode.hidden = !on;
    engine.hemi.intensity = on ? 1.15 : 1.6;
    ctx.setData("visible", on ? "no" : "yes");
  }

  // The part to point at: the first one not taken yet, ahead of the guinea pig
  function updateNext() {
    for (const part of parts) {
      if (!part.done) {
        if (part.x >= player.x - 1.5) {
          nextPart = part.index;
          return;
        }
      }
    }
    // Nothing left ahead: what was missed behind is told at the end, the goal is the record
    nextPart = totalParts;
  }

  function renderBar() {
    updateNext();
    const part = parts[nextPart];
    const taken = parts.filter((p) => p.done).length;
    const goal = ending ? "" : part ? t("goalNext", { label: part.label }) : recordAt ? t("goalBoss") : t("goalEnd");
    if (goal !== lastGoal) {
      lastGoal = goal;
      hud.goal(goal);
    }
    partsNode.textContent = t("parts") + " " + taken + "/" + totalParts;
    vegNode.textContent = t("vegetablesCount", { n: eaten }).replace(/\.$/, "");
    ctx.setData("parts", taken);
    ctx.setData("vegetables", eaten);
    ctx.setData("next", part ? part.label : "end");
  }

  function collectPart(part) {
    // Out of order still counts, for fewer points and a word on the right order
    // (one left far behind is simply missed: the end of the world says so)
    const skipped = parts.find((p) => !p.done && p.index < part.index && p.x > part.x - 8);
    part.done = true;
    part.flying = 0.01;
    const big = part.kind === "meta";
    const color = new THREE.Color(part.color).getHex();
    ctx.fx.burst(part.x, part.y, 0.3, big ? { count: 60, speed: 5, up: 6 } : { count: 16, colors: [color, 0xffd24a, 0xffffff], speed: 3, up: 3 });
    ctx.collect(skipped ? 25 : big ? 150 : 50, skipped || part.line ? "" : part.label);
    if (skipped) {
      hud.toast(t("outOfOrder", { label: part.label, first: skipped.label }), "power");
    } else if (part.line) {
      // A metadata: its name, then what it does for the story
      hud.toast(t(part.line), "good");
    }
    if (part.line) {
      hud.tick(part.label);
    }
    if (big || part.kind === "answer") {
      ctx.sound.play("wheek");
    }
    switch (part.event) {
      case "branch":
        hud.toast(t("branch"), "good");
        hud.tick("sf hardis:work:new");
        hud.tick("git checkout -b features/US-014-customer-tier");
        break;
      case "field":
        hud.tick(t("fieldName"));
        break;
      case "repRead":
        revealFaint();
        hud.toast(t("repRead"), "power");
        break;
      case "mgrRead":
        setGhost(false);
        hud.toast(t("mgrRead"), "good");
        coach("c_visible", true);
        ctx.sound.play("happy");
        break;
      default:
        break;
    }
    renderBar();
  }

  /** Save, the button of the field wizard: the field exists, and nobody can see it. */
  function save() {
    saved = true;
    hud.toast(t("saved"), "good");
    hud.tick("Customer_Tier__c");
    ctx.sound.play("click");
    // The twist, a beat after the success toast
    twistAt = engine.time + 1.1;
  }

  /** The pace follows the parts taken; a mistake buys a few calmer seconds. */
  function updatePace(dt) {
    const progress = parts.filter((p) => p.done).length / totalParts;
    // The first stage stays at the gentle pace, then the level picks up
    const ramp = Math.max(0, (progress - PACE_CALM) / (1 - PACE_CALM));
    // The castle has its own steady pace: the fight is the same whatever came before
    const level = checkpoint === BOSS_CP ? 1 : 1 + PACE_GAIN * ramp * (0.35 + 0.65 * ramp);
    const wanted = level * (mercy > 0 ? MERCY_FACTOR : 1);
    mercy = Math.max(0, mercy - dt);
    pace += Math.sign(wanted - pace) * Math.min(Math.abs(wanted - pace), PACE_RATE * dt);
    ctx.setData("pace", pace.toFixed(2));
    // Each new step of the Path is said out loud
    const stage = checkpoints[checkpoint].path;
    if (stage > pacedStage) {
      pacedStage = stage;
      if (stage > 0 && pace > 1.02) {
        hud.toast(t("faster"), "power");
        ctx.sound.play("power");
      }
    }
  }

  /** The big yellow instruction: once per moment, never in a rush. */
  function coach(key, force) {
    if (force || engine.time - coachAt > 3) {
      coachAt = engine.time;
      hud.coach(t(key));
    }
  }

  function coachOnce(key) {
    if (!coached.has(key)) {
      coached.add(key);
      coach(key, true);
    }
  }

  function hurt(title, tip, from, coachKey) {
    if (player.inv > 0) {
      return;
    }
    const left = loseOne(title, tip);
    mercy = MERCY_S;
    coach(coachKey || "c_hazard", true);
    player.inv = INVULNERABLE_S;
    player.hit = 0.6;
    shake = engine.motion ? 0.35 : 0;
    const dir = Math.sign(player.x - from) || -player.facing;
    player.vx = dir * 7;
    player.vy = 8;
    player.lock = 0.3;
    player.grounded = false;
    return left;
  }

  function fell() {
    const trap = trapFalling || trapStood;
    trapFalling = null;
    trapStood = null;
    if (trap) {
      // Never twice the same mistake: that answer holds from now on
      trap.learned = true;
    }
    // In the castle the drop is the lava
    const lavaFall = player.x > CASTLE_X0 && player.x < WALL_X0;
    if (lavaFall) {
      ctx.fx.burst(player.x, LAVA_Y + 0.2, 0.2, { count: 30, colors: [0xff6a00, 0xffd24a, 0xba0517], speed: 3, up: 5 });
      ctx.sound.play("lavaSplash");
    }
    if (isGiant()) {
      shrinkNow();
      if (!trap) {
        // A giant that falls off a plain edge only shrinks back. A wrong answer
        // that gives way is the lesson: it counts, giant or not
        hud.toast(t("giantHit"), "power");
        coach("c_fall", true);
        respawn();
        return;
      }
    }
    loseOne(trap ? trap.title : lavaFall ? "o_lava" : "o_fall", trap ? trap.tip : lavaFall ? "o_lava_tip" : "o_fall_tip");
    mercy = MERCY_S;
    if (ctx.playing) {
      coach("c_fall", true);
      respawn();
    }
  }

  /** A heart lost; the last one in the castle says where the next try starts, and keeps it. */
  function loseOne(titleKey, tipKey) {
    const atBoss = checkpoint === BOSS_CP;
    const last = atBoss && ctx.attempts <= 1;
    if (atBoss) {
      boss.losses += 1;
    }
    const left = ctx.loseAttempt(t(titleKey), t(tipKey) + (last ? " " + t("retryHint") : ""));
    if (!ctx.playing && atBoss) {
      bossRetryAt = Date.now();
    }
    return left;
  }

  function respawn() {
    const cp = checkpoints[checkpoint];
    player.x = cp.x;
    player.y = cp.y + 0.6;
    player.vx = 0;
    player.vy = 0;
    player.grounded = false;
    player.inv = 1.2;
    player.facing = 1;
    for (const p of platforms) {
      if (p.trap) {
        p.gone = false;
        p.timer = 0;
        p.fallV = 0;
        p.mesh.position.set(p.x0 + p.w / 2, p.top - p.h / 2, 0);
        p.mesh.rotation.z = 0;
      }
    }
    camX = player.x + 2;
    camY = player.y + 1.4;
    if (checkpoint === BOSS_CP && boss.phase === "fight") {
      resetAdmin(1.4);
    }
  }

  /* ---------- Physics ---------- */

  function movePlatforms(dt) {
    for (const p of platforms) {
      if (p.move) {
        // A moving element waits a moment at each end, so it can be timed
        p.phase = (p.phase || 0) + dt * p.move.speed * pace;
        const wave = Math.max(-1, Math.min(1, 1.5 * Math.sin(p.phase)));
        const nx0 = p.move.axis === "x" ? p.bx0 + wave * p.move.amp : p.x0;
        const ntop = p.move.axis === "y" ? p.btop + ((wave + 1) / 2) * p.move.amp : p.top;
        p.dx = nx0 - p.x0;
        p.dy = ntop - p.top;
        p.x0 = nx0;
        p.x1 = nx0 + p.w;
        p.top = ntop;
        p.mesh.position.set(p.x0 + p.w / 2, p.top - p.h / 2, 0);
      }
    }
    for (const h of hazards) {
      h.phase = (h.phase === undefined ? h.x : h.phase) + dt * h.speed * pace;
      const wave = Math.sin(h.phase);
      h.cx = h.axis === "x" ? h.x + wave * h.amp : h.x;
      h.bottom = h.axis === "y" ? h.y + ((wave + 1) / 2) * h.amp : h.y;
      h.mesh.position.set(h.cx, h.bottom + h.h / 2, 0);
    }
  }

  function solid(p) {
    return !p.gone;
  }

  function stepPlayer(dt) {
    // The hit box follows the size of the guinea pig
    const halfW = HALF_W * giant.size;
    const foot = FOOT * giant.size;
    const height = HEIGHT * giant.size;
    const stepUp = STEP_UP * (1 + (giant.size - 1) * 0.5);
    // Carried by the platform it stands on
    if (player.grounded && player.ground && player.ground.move) {
      player.x += player.ground.dx;
      player.y = player.ground.top;
    }
    const wasGrounded = player.grounded;
    const left = held.left || nudge.left > 0;
    const right = held.right || nudge.right > 0;
    const want = player.lock > 0 || ending ? 0 : (right ? 1 : 0) - (left ? 1 : 0);
    if (want !== 0) {
      player.facing = want;
    }
    const accel = (wasGrounded ? GROUND_ACCEL : AIR_ACCEL) * dt;
    const target = want * RUN_SPEED * (1 + (pace - 1) * PACE_RUN_SHARE);
    if (player.lock <= 0) {
      player.vx += Math.sign(target - player.vx) * Math.min(Math.abs(target - player.vx), accel);
    }

    // Jump: buffered, with coyote time
    if (player.buffer > 0 && (wasGrounded || player.coyote > 0) && !ending) {
      player.vy = JUMP_SPEED;
      player.buffer = 0;
      player.coyote = 0;
      player.grounded = false;
      // Let go before the jump even started (a quick tap of the key): a short hop
      player.cut = heldPress && !held.jump;
      heldPress = false;
      player.squash = -0.18;
      ctx.sound.play("wheek");
    }
    if (player.cut && player.vy > 0) {
      player.vy *= JUMP_CUT;
      player.cut = false;
    } else if (player.vy <= 0) {
      player.cut = false;
    }
    player.vy = Math.max(MAX_FALL, player.vy - GRAVITY * dt);

    // Across
    player.x += player.vx * dt;
    for (const p of platforms) {
      if (!solid(p)) {
        continue;
      }
      const bottom = p.top - p.h;
      if (player.y + height <= bottom + 0.01 || player.y >= p.top - 0.01) {
        continue;
      }
      if (player.x + halfW <= p.x0 || player.x - halfW >= p.x1) {
        continue;
      }
      if (wasGrounded && p.top - player.y <= stepUp && player.vy <= 0.01) {
        // A low step: up onto it, feet on it
        player.y = p.top;
        player.x = Math.min(Math.max(player.x, p.x0 - foot + 0.03), p.x1 + foot - 0.03);
        continue;
      }
      player.x = player.x < (p.x0 + p.x1) / 2 ? p.x0 - halfW : p.x1 + halfW;
      player.vx = 0;
    }

    // Up and down
    const prevY = player.y;
    const impact = -player.vy;
    player.y += player.vy * dt;
    let landed = null;
    for (const p of platforms) {
      if (!solid(p) || player.x + foot <= p.x0 || player.x - foot >= p.x1) {
        continue;
      }
      const bottom = p.top - p.h;
      if (player.vy <= 0 && prevY >= p.top - 0.06 - Math.max(0, p.dy) && player.y < p.top) {
        player.y = p.top;
        player.vy = 0;
        landed = p;
      } else if (player.vy > 0 && prevY + height <= bottom + 0.06 && player.y + height > bottom) {
        player.y = bottom - height;
        player.vy = 0;
        if (p.mushroom && !p.used) {
          bumpBlock(p);
        }
      }
    }
    player.grounded = Boolean(landed);
    if (landed && !landed.trap) {
      trapFalling = null;
      trapStood = null;
    } else if (landed && landed.trap && !landed.trap.learned) {
      trapStood = landed.trap;
    }
    player.ground = landed;
    if (landed === savePlatform && !saved) {
      save();
    }
    if (landed && !wasGrounded) {
      if (impact > 6) {
        player.squash = Math.min(0.3, impact * 0.022);
        dust.position.set(player.x, landed.top + 0.02, 0);
        dustTime = 0.35;
      }
    }
    if (wasGrounded && !landed && player.vy <= 0) {
      player.coyote = COYOTE_S;
    }
    // A trap gives way after the guinea pig has stood on it a moment
    if (landed && landed.trap && !landed.gone && !landed.trap.learned) {
      if (landed.timer === 0) {
        // Warned at once: there is time to jump back before it gives way
        hud.toast(t(landed.trap.title), "bad");
        coach("c_trap", true);
      }
      landed.timer += dt;
      if (landed.timer > landed.trap.delay / pace) {
        landed.gone = true;
        trapFalling = landed.trap;
        hud.toast(t(landed.trap.title), "bad");
        ctx.sound.play("wrong");
      }
    }
    player.coyote = Math.max(0, player.coyote - dt);
    player.buffer = Math.max(0, player.buffer - dt);
    player.inv = Math.max(0, player.inv - dt);
    player.lock = Math.max(0, player.lock - dt);
    player.hit = Math.max(0, player.hit - dt);
    nudge.left = Math.max(0, nudge.left - dt);
    nudge.right = Math.max(0, nudge.right - dt);
  }

  function dropTraps(dt) {
    for (const p of platforms) {
      if (p.trap && p.gone) {
        p.fallV += GRAVITY * 0.5 * dt;
        p.mesh.position.y -= p.fallV * dt;
        p.mesh.rotation.z += dt * 0.6;
      } else if (p.trap && p.timer > 0 && !p.gone) {
        // It trembles before it goes
        p.mesh.position.x = p.x0 + p.w / 2 + (engine.motion ? Math.sin(engine.time * 60) * 0.04 * (p.timer / p.trap.delay) : 0);
      }
    }
  }

  function touch(time) {
    const cx = player.x;
    const cy = player.y + 0.45 * giant.size;
    // A giant reaches a little further for the parts (its body is bigger), and
    // much further for the vegetables
    const reach = PART_RADIUS * (1 + (giant.size - 1) * 0.5);
    const vegReach = VEGETABLE_RADIUS * (1 + (giant.size - 1) * 1.2);
    for (const part of parts) {
      if (part.done) {
        continue;
      }
      if ((part.x - cx) ** 2 + (part.y - cy) ** 2 < reach * reach) {
        collectPart(part);
      }
    }
    for (const v of vegetables) {
      if (!v.done && (v.x - cx) ** 2 + (v.y - cy) ** 2 < vegReach * vegReach) {
        eatVegetable(v);
      }
    }
    for (const m of mushrooms) {
      if ((m.state === "ready" || (m.state === "popping" && m.t > 0.3)) && (m.x - cx) ** 2 + (m.y - cy) ** 2 < (MUSHROOM_RADIUS + (giant.size - 1) * 0.5) ** 2) {
        eatMushroom(m);
      }
    }
    for (const r of refreshes) {
      if (!r.done && (r.x - cx) ** 2 + (r.y - cy) ** 2 < reach * reach) {
        r.done = true;
        r.group.visible = false;
        if (!ctx.gainAttempt()) {
          ctx.points(50);
        }
        ctx.sound.play("power");
        hud.toast(t("refresh"), "power");
      }
    }
    if (!note.done && (note.x - cx) ** 2 + (note.y - cy) ** 2 < reach * reach) {
      note.done = true;
      note.group.visible = false;
      ctx.foundNote();
    }
    if (!decoyDone && (DECOY_X - cx) ** 2 + (DECOY_Y - cy) ** 2 < 0.7 * 0.7) {
      decoyDone = true;
      decoy.visible = false;
      ctx.points(-50);
      ctx.sound.play("wrong");
      hud.toast(t("o_repEdit"), "bad");
      hud.tip(t("o_repEdit_tip"));
    }
    for (const h of hazards) {
      const m = HAZARD_MARGIN;
      const halfW = HALF_W * giant.size;
      if (!h.smashed && player.x + halfW - m > h.cx - h.w / 2 && player.x - halfW + m < h.cx + h.w / 2 && player.y + HEIGHT * giant.size - m > h.bottom && player.y + m < h.bottom + h.h) {
        if (isGiant()) {
          smash(h);
          continue;
        }
        hurt("o_valid", "o_valid_tip", h.cx);
        if (!ctx.playing) {
          return;
        }
      }
    }
    // A floating mushroom is told as it comes into view
    for (const m of mushrooms) {
      if (m.state === "ready" && Math.abs(m.x - player.x) < 7) {
        coachOnce("c_mushroom");
      }
    }
    // Each new mechanic is said once, as it comes into view
    if (player.x > 62 && player.x < 66) {
      coachOnce("c_hazard");
    } else if (player.x > 122 && player.x < 126) {
      coachOnce("c_lift");
    }
    // The checkpoints: a flag turns green as the guinea pig passes it
    for (let i = checkpoint + 1; i < checkpoints.length; i++) {
      if (player.x >= checkpoints[i].x && player.grounded) {
        checkpoint = i;
        checkpoints[i].flag.material = flagGreen;
        if (checkpoints[i].star) {
          checkpoints[i].star.visible = true;
        }
        if (CHECKPOINTS[i][3]) {
          hud.tick(CHECKPOINTS[i][3]);
        }
        ctx.fx.burst(checkpoints[i].x, checkpoints[i].y + 1.4, -0.9, { count: 10, colors: [0x2e844a, 0x91db8b, 0xffffff], speed: 2, up: 2.5, life: 0.7 });
        ctx.sound.play("click");
      }
    }
    if (checkpoints[checkpoint].path !== pathIndex) {
      pathIndex = checkpoints[checkpoint].path;
      hud.setPath([t("path0"), t("path1"), t("path2"), t("path3")], pathIndex);
    }
    // The last lesson: the record page shows the field, or nothing; what was
    // missed is told, not enforced. The castle comes next whatever happened
    if (!recordAt && player.x >= END_X && player.grounded && player.ground === recordPlatform) {
      recordAt = clock;
      ctx.sound.play("gate");
      // The sales manager's choice, typed in: Gold, whatever was eaten on the way.
      // Still a ghost: no permission set grants the field to you, the record shows nothing
      recordPlatform.record.draw(ghost ? null : "Gold");
      hud.toast(ghost ? t("doneGhost") : t("done", { n: "Gold" }), ghost ? "bad" : "good");
      renderBar();
    }
    // The axe, at the far end: the bridge goes, and the admin with it
    if (!ending && (boss.phase === "talk" || boss.phase === "fight") && player.x > AXE_X - 0.95 && player.y < BRIDGE_TOP + 2.4) {
      touchAxe();
    }
  }

  /** What was missed, said plainly: the two that matter most, then the rest by name. */
  function missedInfo() {
    const missed = parts.filter((p) => !p.done);
    const reasons = [];
    const explain = (key, test, always) => {
      const these = missed.filter(test);
      if (these.length || always) {
        reasons.push({ text: t(key), parts: these });
      }
    };
    if (ghost) {
      explain("info_ghost", (p) => p.event === "mgrRead", true);
    }
    explain("info_field", (p) => p.event === "field");
    explain("info_rep", (p) => p.event === "repRead");
    explain("info_layout", (p) => p.event === "layout");
    const shown = reasons.slice(0, 2);
    // The rest, by name: what the sentences shown do not already cover
    const covered = new Set(shown.flatMap((r) => r.parts));
    const others = [...new Set(missed.filter((p) => !covered.has(p)).map((p) => p.label))];
    // The vegetables first, as in world 0
    const lines = [t("vegetablesCount", { n: eaten })].concat(shown.map((r) => r.text));
    if (others.length) {
      lines.push(t("info_other", { list: others.slice(0, 4).join(", ") + (others.length > 4 ? ", ..." : "") }));
    }
    // The mushroom is fun, never a lesson: told, never counted (not on a try
    // that started at the bridge, which never passed it)
    if (!giant.eaten && startAt < BOSS_CHECK_X) {
      lines.push(t("info_mushroom"));
    }
    // What the admin's fall says
    lines.push(t("info_boss"));
    return { text: lines.join(" "), count: missed.length };
  }

  /* ---------- The mushroom and the giant ---------- */

  /** Giant, or growing into it: hazards break, a plain fall only shrinks it back. */
  function isGiant() {
    return giant.want === 1 || giant.k > 0.5;
  }

  /** Bumped from below: the block goes dull, its mushroom hops out. */
  function bumpBlock(block) {
    block.used = true;
    block.bump = 0.001;
    block.mesh.material = [blockSideUsed, blockSideUsed, blockUsed, blockSideUsed, blockUsed, blockSideUsed];
    ctx.sound.play("click");
    ctx.sound.play("power");
    const m = block.mushroom;
    m.state = "popping";
    m.t = 0;
    m.group.visible = true;
    // Where it lands: on top of whatever is below its landing spot
    let floor = null;
    for (const p of platforms) {
      if (p !== block && !p.trap && m.landX > p.x0 && m.landX < p.x1 && p.top < block.top - block.h && (!floor || p.top > floor.top)) {
        floor = p;
      }
    }
    m.fromX = m.x;
    m.fromY = block.top + MUSHROOM_HEIGHT / 2;
    m.toY = (floor ? floor.top : block.top - block.h - 2) + MUSHROOM_HEIGHT / 2;
    coachOnce("c_mushroom");
  }

  /** The grow: points, a rising sound, a toast, and ten seconds of giant. */
  function eatMushroom(m) {
    m.state = "eaten";
    m.group.visible = false;
    giant.eaten += 1;
    giant.left = GIANT_S;
    giant.want = 1;
    giant.shrinking = false;
    ctx.collect(MUSHROOM_POINTS, "");
    hud.toast(t("giant"), "power");
    ctx.sound.play("grow");
    ctx.fx.burst(m.x, m.y, 0.3, { count: 40, colors: [0xe8231a, 0xffffff, 0xffd24a], speed: 4, up: 5 });
    pig.hop();
  }

  /** A validation rule under a giant: it breaks, for points. */
  function smash(h) {
    h.smashed = true;
    h.mesh.visible = false;
    giant.smashed += 1;
    ctx.fx.burst(h.cx, h.bottom + h.h / 2, 0.2, { count: 50, colors: [0xba0517, 0xfe5c4c, 0xffffff], speed: 6, up: 6 });
    ctx.collect(SMASH_POINTS, t("smashed"));
    ctx.sound.play("smash");
    shake = engine.motion ? 0.3 : 0;
  }

  /** At once, after a fall: no room to wait for. */
  function shrinkNow() {
    giant.k = 0;
    giant.size = 1;
    giant.left = 0;
    giant.want = 0;
    giant.shrinking = false;
    ctx.sound.play("shrink");
  }

  function sizeAt(k) {
    // Ease out, with a small overshoot: it pops up to its new size
    const e = 1 - Math.pow(1 - k, 3);
    return 1 + (GIANT_SCALE - 1) * Math.min(1.04, e + Math.sin(k * Math.PI) * 0.08);
  }

  /** Room to grow to this size where it stands: no platform inside its box. */
  function roomFor(size) {
    const halfW = HALF_W * size;
    const height = HEIGHT * size;
    for (const p of platforms) {
      if (!solid(p)) {
        continue;
      }
      const overlapX = player.x + halfW > p.x0 + 0.01 && player.x - halfW < p.x1 - 0.01;
      const overlapY = player.y + height > p.top - p.h + 0.01 && player.y < p.top - 0.01;
      if (overlapX && overlapY) {
        return false;
      }
    }
    return true;
  }

  /** Shrinking on the ground keeps its feet on it: never off an edge into a pit. */
  function keepsFooting(size) {
    if (!player.grounded || !player.ground) {
      return true;
    }
    const foot = FOOT * size;
    const p = player.ground;
    return player.x + foot > p.x0 && player.x - foot < p.x1;
  }

  function updateGiant(dt) {
    if (giant.left > 0) {
      giant.left = Math.max(0, giant.left - dt);
      if (giant.left === 0) {
        giant.want = 0;
      }
    }
    if (giant.k !== giant.want) {
      const k = Math.max(0, Math.min(1, giant.k + Math.sign(giant.want - giant.k) * (dt / GROW_S)));
      const size = k === 0 ? 1 : sizeAt(k);
      // No room: it waits, at the size it has, until there is
      const fits = size > giant.size ? roomFor(size) : keepsFooting(size);
      if (fits) {
        if (k < giant.k && !giant.shrinking) {
          giant.shrinking = true;
          ctx.sound.play("shrink");
        }
        giant.k = k;
        giant.size = size;
      }
    }
    if (giant.k === 0) {
      giant.shrinking = false;
    }
    const on = giant.want === 1 || giant.k > 0;
    if (on !== giant.on) {
      giant.on = on;
      ctx.setData("giant", on ? "on" : "off");
    }
    giantNode.hidden = !on;
    if (on) {
      giantNode.textContent = t("giantLeft", { n: Math.ceil(giant.left) + " s" });
      // The last seconds blink
      giantNode.style.opacity = giant.left > 0 && giant.left < GIANT_WARN_S && Math.floor(engine.time * 6) % 2 === 0 ? "0.35" : "1";
    }
  }

  function placeMushrooms(dt, time) {
    for (const m of mushrooms) {
      if (m.block && m.block.bump > 0) {
        // The block jumps up a little as it is hit
        m.block.bump += dt;
        const k = m.block.bump / 0.25;
        m.block.mesh.position.y = m.block.top - m.block.h / 2 + (k < 1 ? Math.sin(k * Math.PI) * 0.25 : 0);
        if (k >= 1) {
          m.block.bump = 0;
        }
      }
      if (m.state === "popping") {
        // Out of the top of the block, then a hop to the floor in front of it
        m.t += dt;
        const rise = Math.min(1, m.t / 0.3);
        const hop = Math.max(0, Math.min(1, (m.t - 0.3) / 0.55));
        m.x = m.fromX + (m.landX - m.fromX) * hop;
        m.y = m.fromY - MUSHROOM_HEIGHT * (1 - rise) + (m.toY - m.fromY) * hop + Math.sin(hop * Math.PI) * 1.2;
        if (hop >= 1) {
          m.state = "ready";
          m.restY = m.toY;
        }
      } else if (m.state === "ready") {
        const base = m.restY !== undefined ? m.restY : m.y0 !== undefined ? m.y0 : (m.y0 = m.y);
        m.y = base + Math.sin(time * 3 + m.x) * 0.06;
      }
      m.group.position.set(m.x, m.y, 0.2);
      m.group.rotation.y = Math.sin(time * 2 + m.x) * 0.5;
    }
  }

  /* ---------- The castle, step by step ---------- */

  function setPhase(phase) {
    boss.phase = phase;
    boss.t = 0;
    ctx.setData("boss", phase);
  }

  /** One line of the talk before the fight, as a chat bubble with the speaker's face. */
  function say(who, text, seconds) {
    // The admin opens the talk; the guinea pig's answer comes under his line
    if (who === "admin") {
      clearTalk();
    }
    const bubble = document.createElement("div");
    bubble.className = "gr-bubble gr-w1-say gr-w1-say--" + who;
    const avatar = document.createElement("span");
    avatar.className = "gr-avatar gr-w1-avatar";
    avatar.style.backgroundImage = 'url("' + (who === "admin" ? ADMIN_FACE_URL : PIG_FACE_URL) + '")';
    const content = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = who === "admin" ? t("adminName") : t("castYou");
    const words = document.createElement("span");
    words.textContent = text;
    content.append(name, words);
    bubble.append(avatar, content);
    talk.appendChild(bubble);
    talkLines.push({ node: bubble, left: Math.max(seconds, readingMs(text) / 1000) });
  }

  function clearTalk() {
    talk.replaceChildren();
    talkLines.length = 0;
  }

  function updateTalk(dt) {
    for (let i = talkLines.length - 1; i >= 0; i--) {
      const line = talkLines[i];
      line.left -= dt;
      if (line.left < 0.4) {
        line.node.classList.add("is-leaving");
      }
      if (line.left <= 0) {
        line.node.remove();
        talkLines.splice(i, 1);
      }
    }
  }

  /** The guinea pig walks in: the darker music, and the admin says what he wants. */
  function enterCastle() {
    MUSIC = "1-castle";
    if (boss.retry) {
      // Straight back after the last heart: no talk, a calm second, and go
      hud.toast(t("retryBoss"), "power");
      startFight(1.6);
      return;
    }
    setPhase("talk");
    boss.youAt = Math.max(TALK_YOU_S, (0.8 * readingMs(t("adminSay"))) / 1000);
    boss.endAt = Math.max(TALK_END_S, boss.youAt + (0.9 * readingMs(t("youSay"))) / 1000);
    say("admin", t("adminSay"), boss.youAt + 0.2);
    ctx.sound.play("bridgeStomp");
    renderBar();
  }

  function startFight(firstThrow) {
    ctx.bossStarted();
    setPhase("fight");
    resetAdmin(firstThrow);
    coach("c_axe", true);
    renderBar();
  }

  /** Back at his spot, nothing in the air, a moment before the next Flow. */
  function resetAdmin(calm) {
    boss.x = ADMIN_HOME;
    boss.y = BRIDGE_TOP;
    boss.vy = 0;
    boss.state = "stand";
    boss.t = 0;
    boss.calm = calm;
    boss.nextThrow = calm + 0.2;
    boss.nextJump = 4.5 + ctx.random() * 2;
    boss.jumpIn = -1;
    boss.cooldown = 0;
    heldFlow.visible = false;
    clearFlows(false);
  }

  function clearFlows(puff) {
    for (const f of flows) {
      if (f.live && puff) {
        ctx.fx.burst(f.x, f.y, 0.2, { count: 8, colors: [0xff7a1a, 0xffd24a, 0xffffff], speed: 2, up: 1.5, life: 0.5 });
      }
      f.live = false;
    }
  }

  function updateCastle(dt) {
    updateTalk(dt);
    if (boss.phase === "wait") {
      if (recordAt > 0 && clock - recordAt > 1.8 && player.x < TALK_X) {
        coachOnce("c_castle");
      }
      if (player.x > TALK_X) {
        enterCastle();
      }
      return;
    }
    boss.t += dt;
    if (boss.phase === "talk") {
      if (!boss.saidYou && boss.t > boss.youAt) {
        boss.saidYou = true;
        say("you", t("youSay"), boss.endAt - boss.youAt + 1.6);
      }
      if (boss.t > boss.endAt || player.x > BRIDGE_X0 + 0.4) {
        startFight(boss.t > boss.endAt ? 0.3 : 0.6);
      }
      adminTouches();
      return;
    }
    if (boss.phase === "fight") {
      // Rushed onto the bridge: the guinea pig still says why, once the admin is done
      if (!boss.saidYou && !boss.retry && !talkLines.length) {
        boss.saidYou = true;
        say("you", t("youSay"), 5.5);
      }
      fightStep(dt);
      moveFlows(dt);
      if (ctx.playing) {
        adminTouches();
      }
      return;
    }
    if (boss.phase === "axe" || boss.phase === "fall" || boss.phase === "down") {
      collapseStep(dt);
      fallStep(dt);
    }
  }

  /** The admin's mind: jump when the guinea pig comes close, throw a Flow now and then, walk. */
  function fightStep(dt) {
    const ease = 1 + BOSS_EASE * Math.min(3, boss.losses);
    boss.calm = Math.max(0, boss.calm - dt);
    boss.cooldown = Math.max(0, boss.cooldown - dt);
    boss.nextThrow -= dt;
    boss.nextJump -= dt;
    if (boss.state === "air") {
      adminFly(dt, true);
      return;
    }
    if (boss.state === "crouch") {
      if (boss.t >= ADMIN_CROUCH_S) {
        boss.state = "air";
        boss.t = 0;
        boss.vy = ADMIN_JUMP_V;
        boss.jumps += 1;
        ctx.setData("adminJumps", boss.jumps);
      }
      return;
    }
    if (boss.state === "windup") {
      if (boss.t >= WINDUP_S * (1 + (ease - 1) * 0.5)) {
        throwFlow(ease);
      }
      return;
    }
    // Standing or walking: he faces the guinea pig. The guinea pig close on the
    // bridge makes him stand his ground and jump after a moment, the first time
    // soon, then less sure (the way under him); the calm after a hit only holds
    // his Flows and his other jumps
    const dx = player.x - boss.x;
    boss.facing = dx < 0 ? -1 : 1;
    // Close, even in the air: he stays where he is; on the bridge, he gets ready to jump
    const close = player.x > BRIDGE_X0 - 1.5 && Math.abs(dx) < ADMIN_NEAR;
    const onBridge = player.y < BRIDGE_TOP + 0.9;
    let near = false;
    if (close && onBridge && boss.cooldown <= 0) {
      if (boss.jumpIn < 0) {
        boss.jumpIn = boss.jumps ? 0.35 + ctx.random() * 1.1 : 0.5;
      } else {
        boss.jumpIn = Math.max(0, boss.jumpIn - dt);
        near = boss.jumpIn === 0;
      }
    } else {
      boss.jumpIn = -1;
    }
    if (boss.calm > 0 && !near) {
      boss.state = "stand";
      return;
    }
    if (near || boss.nextJump <= 0) {
      boss.state = "crouch";
      boss.t = 0;
      boss.jumpIn = -1;
      if (near) {
        coachOnce("c_under");
      }
      return;
    }
    if (boss.jumpIn >= 0) {
      // Ready to jump: no Flow now
      boss.state = "stand";
      return;
    }
    if (boss.nextThrow <= 0 && Math.abs(dx) > 2.6) {
      boss.state = "windup";
      boss.t = 0;
      // The first one low, to learn the jump; never two high ones in a row
      boss.high = boss.thrown > 0 && !boss.lastHigh && ctx.random() < 0.4;
      if (!boss.thrown) {
        coachOnce("c_flow");
      }
      return;
    }
    if (close) {
      boss.state = "stand";
      return;
    }
    // A slow patrol round his spot
    boss.state = "walk";
    boss.x += boss.dir * ADMIN_WALK * dt;
    if (boss.x < ADMIN_HOME - ADMIN_PATROL) {
      boss.x = ADMIN_HOME - ADMIN_PATROL;
      boss.dir = 1;
    } else if (boss.x > ADMIN_HOME + ADMIN_PATROL) {
      boss.x = ADMIN_HOME + ADMIN_PATROL;
      boss.dir = -1;
    }
  }

  /** Up and down; lands on what is left of the bridge, or falls when nothing is. */
  function adminFly(dt, fighting) {
    boss.vy -= ADMIN_GRAVITY * dt;
    boss.y += boss.vy * dt;
    if (boss.y > BRIDGE_TOP || boss.vy > 0) {
      return;
    }
    if (bridgeUnder(boss.x)) {
      boss.y = BRIDGE_TOP;
      boss.vy = 0;
      boss.state = "stand";
      boss.t = 0;
      boss.cooldown = 0.9 + ctx.random() * 0.8;
      boss.nextJump = 4.5 + ctx.random() * 2;
      shake = engine.motion ? 0.2 : 0;
      ctx.sound.play("bridgeStomp");
      ctx.fx.burst(boss.x, BRIDGE_TOP + 0.05, 0.3, { count: 12, colors: [0xffffff, 0xd8c3a5], speed: 3, up: 1.2, life: 0.5 });
    } else if (!fighting) {
      startFall(false);
    }
  }

  function bridgeUnder(x) {
    return !bridge.gone && x - 0.35 < bridge.x1 && x + 0.35 > bridge.x0;
  }

  function throwFlow(ease) {
    boss.state = "stand";
    boss.t = 0;
    heldFlow.visible = false;
    const f = flows.find((one) => !one.live);
    if (f) {
      f.live = true;
      f.high = boss.high;
      f.x = boss.x + boss.facing * 1.0;
      f.y = boss.high ? FLOW_HIGH : FLOW_LOW;
      f.vx = (boss.facing * FLOW_SPEED) / (1 + (ease - 1) * 0.5);
      f.age = 0;
      boss.thrown += 1;
      ctx.setData("flows", boss.thrown);
      ctx.sound.play("fireFlow");
    }
    boss.lastHigh = boss.high;
    boss.nextThrow = (THROW_GAP_S + ctx.random() * 0.8) * ease;
  }

  function moveFlows(dt) {
    const halfW = HALF_W * giant.size - HAZARD_MARGIN;
    const bottom = player.y + HAZARD_MARGIN;
    const top = player.y + HEIGHT * giant.size - HAZARD_MARGIN;
    for (const f of flows) {
      if (!f.live) {
        continue;
      }
      f.age += dt;
      f.x += f.vx * dt;
      if (f.x < CASTLE_X0 - 6 || f.x > WALL_X0) {
        f.live = false;
        continue;
      }
      // A circle against the guinea pig's box, with forgiving edges
      const r = FLOW_R * 0.85;
      const nx = Math.max(player.x - halfW, Math.min(f.x, player.x + halfW));
      const ny = Math.max(bottom, Math.min(f.y, top));
      if ((f.x - nx) ** 2 + (f.y - ny) ** 2 < r * r && player.inv <= 0) {
        f.live = false;
        ctx.fx.burst(f.x, f.y, 0.3, { count: 18, colors: [0xff7a1a, 0xea001e, 0x0176d3, 0xffffff], speed: 3, up: 2 });
        bossHit("o_flowHit", "o_flowHit_tip", f.x - f.vx, "c_flow");
        if (!ctx.playing) {
          return;
        }
      }
    }
  }

  /** Into the admin: a hit, giant or not; a giant only shrinks back. */
  function adminTouches() {
    if (player.inv > 0) {
      return;
    }
    const m = HAZARD_MARGIN;
    const halfW = HALF_W * giant.size;
    const overlapX = player.x + halfW - m > boss.x - ADMIN_HALF_W && player.x - halfW + m < boss.x + ADMIN_HALF_W;
    const overlapY = player.y + HEIGHT * giant.size - m > boss.y + 0.05 && player.y + m < boss.y + ADMIN_H - 0.1;
    if (overlapX && overlapY) {
      bossHit("o_admin", "o_admin_tip", boss.x, "c_under");
    }
  }

  /** What the admin does to the guinea pig: a heart, or a giant's size, and a calm moment. */
  function bossHit(title, tip, from, coachKey) {
    boss.calm = Math.max(boss.calm, 2);
    boss.nextThrow = Math.max(boss.nextThrow, 2.4);
    if (boss.state === "windup") {
      boss.state = "stand";
      heldFlow.visible = false;
    }
    clearFlows(true);
    if (isGiant()) {
      // A giant shrugs off one hit: it only shrinks back
      shrinkNow();
      hud.toast(t("giantHit"), "power");
      player.inv = INVULNERABLE_S;
      player.hit = 0.6;
      const dir = Math.sign(player.x - from) || -player.facing;
      player.vx = dir * 6;
      player.vy = 7;
      player.lock = 0.3;
      player.grounded = false;
      return;
    }
    hurt(title, tip, from, coachKey);
  }

  /** The axe: it cuts the chain, and the bridge goes from this end. */
  function touchAxe() {
    ctx.bossBeaten();
    ending = clock;
    setPhase("axe");
    if (boss.state === "windup" || boss.state === "crouch" || boss.state === "walk") {
      boss.state = "stand";
    }
    heldFlow.visible = false;
    clearFlows(true);
    axe.gone = 0.001;
    chain.visible = false;
    collapse.wait = COLLAPSE_WAIT_S;
    collapse.left = BRIDGE_SEGMENTS;
    collapse.moving = true;
    // Never left over the bridge as it goes
    if (player.x < BRIDGE_X1 + 0.6) {
      player.vx = Math.max(player.vx, 3);
    }
    clearTalk();
    ctx.collect(150, "");
    ctx.sound.play("bridgeAxe");
    ctx.fx.burst(AXE_X, BRIDGE_TOP + 1.7, 0.4, { count: 30, colors: [0xffc72c, 0xffffff, 0xdfe5ec], speed: 4, up: 4 });
    renderBar();
  }

  function collapseStep(dt) {
    if (collapse.left <= 0) {
      return;
    }
    collapse.wait -= dt;
    while (collapse.wait <= 0 && collapse.left > 0) {
      collapse.left -= 1;
      const s = segments[collapse.left];
      s.falling = true;
      s.vy = 0;
      s.spin = (collapse.left % 2 ? 1 : -1) * (1.5 + (collapse.left % 3) * 0.6);
      bridge.x1 = BRIDGE_X0 + collapse.left * SEGMENT_W;
      bridge.w = bridge.x1 - bridge.x0;
      if (collapse.left === 0) {
        bridge.gone = true;
      }
      if (collapse.left % 2 === 0) {
        ctx.sound.play("bridgeDrop");
      }
      collapse.wait += COLLAPSE_STEP_S;
    }
  }

  /** He stands on what is left; when that goes, a moment in the air, then the lava. */
  function fallStep(dt) {
    if (boss.phase === "axe") {
      if (boss.state === "air") {
        adminFly(dt, false);
      } else if (!bridgeUnder(boss.x)) {
        startFall(true);
      }
      return;
    }
    if (boss.state === "hang") {
      if (boss.t >= HANG_S) {
        boss.state = "drop";
        boss.vy = 0.8;
      }
      return;
    }
    if (boss.state === "drop") {
      boss.vy -= ADMIN_FALL_GRAVITY * dt;
      boss.y += boss.vy * dt;
      if (!boss.splashed && boss.y < LAVA_Y + 0.15) {
        splash();
      }
      if (boss.splashed) {
        // Sinking slowly, the bubble still over the lava
        boss.vy = Math.max(boss.vy, -0.9);
      }
    }
    if (boss.phase === "down") {
      for (const p of prizes) {
        if (p.t >= 0) {
          p.t += dt;
        }
      }
    }
  }

  function startFall(hang) {
    setPhase("fall");
    boss.state = hang ? "hang" : "drop";
    boss.vy = hang ? 0 : boss.vy;
    adminSign.visible = false;
    screamBubble.visible = true;
    ctx.sound.play("bridgeScream");
    shake = engine.motion ? 0.25 : 0;
  }

  function splash() {
    boss.splashed = true;
    boss.downAt = clock;
    setPhase("down");
    boss.state = "drop";
    shake = engine.motion ? 0.35 : 0;
    ctx.sound.play("lavaSplash");
    ctx.fx.burst(boss.x, LAVA_Y + 0.3, 0.3, { count: 70, colors: [0xff6a00, 0xffd24a, 0xba0517, 0x0176d3], speed: 5, up: 7, life: 1.4 });
    ctx.collect(BOSS_POINTS, t("bossDown"));
    for (const p of prizes) {
      p.t = 0;
      p.item.visible = true;
    }
    pig.hop();
    ctx.sound.play("happy");
  }

  /**
   * For the check: past the admin and to the axe, decided at every step of the
   * world, so it plays the same whatever the frame rate. It waits in front of
   * him, jumps the low Flows, never jumps into a high one, and runs under him
   * while he is up.
   */
  function autopilot() {
    held.left = false;
    held.right = false;
    if (ending) {
      return;
    }
    if (boss.phase === "wait" || boss.phase === "talk") {
      // Hops the gap before Acme Corp, then listens at the door: the fight
      // starts when the talk is over
      held.right = player.x < BRIDGE_X0 - 0.8;
      const edge = player.grounded && player.ground && player.ground.x1 - player.x < 0.6;
      if (edge && !platforms.some((p) => p !== player.ground && !p.gone && p.x0 <= player.ground.x1 + 0.05 && p.x1 > player.ground.x1 && Math.abs(p.top - player.ground.top) < 0.5)) {
        player.buffer = BUFFER_S;
        heldPress = false;
      }
      return;
    }
    const dx = boss.x - player.x;
    const speed = RUN_SPEED * (1 + (pace - 1) * PACE_RUN_SHARE);
    let jump = false;
    let stayDown = false;
    for (const f of flows) {
      if (!f.live || (player.x - f.x) * f.vx <= 0) {
        continue;
      }
      const d = Math.abs(f.x - player.x);
      const closing = Math.abs(f.vx) + Math.max(0, Math.sign(f.x - player.x) * player.vx);
      if (f.high) {
        stayDown = stayDown || d < 4;
      } else if (d < 1.05 + closing * 0.16) {
        jump = true;
      }
    }
    if (dx < -1.1) {
      // Past him: to the axe
      held.right = true;
    } else if (overHim && boss.state !== "crouch" && boss.state !== "air" && (player.grounded ? dx > 2.45 : dx > -1.1)) {
      // Over him: from a little way off, just after a Flow, at full speed, and
      // the jump from 2.45 to 2.9 in front of him; a Flow's jump goes straight up
      const clear = boss.state !== "windup" && boss.nextThrow > 1.5 && !flows.some((f) => f.live);
      if (player.grounded) {
        overJump = false;
      }
      // Once on its way (inside 5.4), it goes on
      held.right = player.grounded ? dx > 5.6 || dx < 5.4 || clear : overJump;
      if (player.grounded && dx < 2.9 && Math.abs(player.vx) > speed * 0.95) {
        player.buffer = BUFFER_S;
        heldPress = false;
        overJump = true;
      }
    } else if (boss.state === "crouch" || boss.state === "air") {
      // From when to when his feet are over the guinea pig's head (0.8 up),
      // against when it would touch him and when it would be past him
      const clear = 0.8;
      const h = boss.y - BRIDGE_TOP;
      const v = boss.state === "crouch" ? ADMIN_JUMP_V : boss.vy;
      const wait = boss.state === "crouch" ? ADMIN_CROUCH_S - boss.t : 0;
      const g = ADMIN_GRAVITY;
      let from = Infinity;
      let until = 0;
      if (h >= clear) {
        from = 0;
        until = (v + Math.sqrt(v * v + 2 * g * (h - clear))) / g;
      } else if (v > 0 && v * v > 2 * g * (clear - h)) {
        from = wait + (v - Math.sqrt(v * v - 2 * g * (clear - h))) / g;
        until = wait + (v + Math.sqrt(v * v - 2 * g * (clear - h))) / g;
      }
      const touch = (dx - 0.95) / speed;
      const past = (dx + 0.95) / speed + 0.12;
      if (dx < 0.95 || ((from === 0 || touch >= from + 0.06) && past <= until)) {
        held.right = true;
      } else if (dx < 2.2) {
        held.left = true;
      }
    } else if (dx > 4.2) {
      held.right = true;
    } else if (dx < 3.4) {
      held.left = true;
    }
    // Over him, it keeps its one jump for him: never a Flow's jump just before
    if (jump && !stayDown && player.grounded && !(overHim && dx < 3.2)) {
      player.buffer = BUFFER_S;
      heldPress = false;
    }
  }

  /** Everything of the castle where it is this frame. */
  function placeCastle(dt, time) {
    // Inside the castle the day goes: the light dims, the camera holds the bridge
    castle.k += ((player.x > CASTLE_CAM_X ? 1 : 0) - castle.k) * Math.min(1, dt * 1.6);
    engine.hemi.intensity = (ghost ? 1.15 : 1.6) * (1 - 0.3 * castle.k);
    engine.sun.intensity = 2.4 * (1 - 0.22 * castle.k);
    if (player.x < CASTLE_CAM_X - 32) {
      // Far away: nothing of it moves on screen
      return;
    }
    if (collapse.moving) {
      let moving = false;
      for (const s of segments) {
        if (s.falling && s.y > LAVA_Y - 1.5) {
          s.vy -= GRAVITY * 0.55 * dt;
          s.y += s.vy * dt;
          s.turn += s.spin * dt;
          moving = true;
        }
      }
      collapse.moving = moving || collapse.left > 0;
      placeSegments();
    }
    lavaTexture.offset.x = time * 0.025;
    lavaTexture.offset.y = Math.sin(time * 0.4) * 0.03;
    glowMaterial.opacity = 0.75 + Math.sin(time * 2.1) * 0.15;
    bubbles.count = bubbleCount;
    for (let i = 0; i < bubbleCount; i++) {
      const k = (time * 0.55 + i * 0.37) % 1;
      cp.set(BRIDGE_X0 + 0.8 + ((i * 2.47) % (BRIDGE_X1 - BRIDGE_X0 - 1.6)), LAVA_Y + k * 0.35, -0.8 + (i % 3) * 0.7);
      const size = k < 0.85 ? 0.4 + k : (1 - k) * 8;
      cs.set(size, size * 0.8, size);
      cm.compose(cp, cq.identity(), cs);
      bubbles.setMatrixAt(i, cm);
    }
    bubbles.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < torches.length; i++) {
      const f = 1 + Math.sin(time * 13 + i * 2) * 0.08 + Math.sin(time * 7.3 + i) * 0.06;
      torches[i].scale.set(0.55 * f, 0.9 * (2 - f), 1);
    }
    placeAxe(dt, time);
    placeAdmin(dt, time);
    placeFlows(time);
    for (let i = 0; i < prizes.length; i++) {
      const p = prizes[i];
      if (p.t >= 0) {
        const k = Math.min(1, p.t / 0.6);
        p.item.position.set(p.x, BRIDGE_TOP + 0.4 + k * 1.4 + Math.sin(time * 3 + i) * 0.06, 0.3);
        p.item.rotation.y = time * 2.4 + i;
        p.item.scale.setScalar(Math.max(0.01, k));
      }
    }
    // The halo points at the axe once nothing else is left to take
    if (!halo.visible && (boss.phase === "talk" || boss.phase === "fight")) {
      halo.visible = true;
      halo.position.set(AXE_X + 0.2, BRIDGE_TOP + 2.35, 0.6);
      halo.scale.setScalar(1.25 + Math.sin(time * 6) * 0.1);
      halo.rotation.z = time;
    }
  }

  /** How far ahead of the guinea pig the castle view looks: as far as the screen allows, the guinea pig kept in sight. */
  function castleLead() {
    const half = Math.max(8, camera.position.z) * Math.tan((camera.fov * Math.PI) / 360) * camera.aspect;
    return Math.max(1.5, Math.min(6.6, half - 2.2));
  }

  function placeSegments() {
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i];
      cp.set(s.x, s.y, 0);
      ce.set(0, 0, s.turn);
      cq.setFromEuler(ce);
      const k = s.y < LAVA_Y - 1.4 ? 0 : 1;
      cs.set(k, k, k);
      cm.compose(cp, cq, cs);
      segmentMesh.setMatrixAt(i, cm);
    }
    segmentMesh.instanceMatrix.needsUpdate = true;
  }

  function placeAxe(dt, time) {
    if (axe.gone > 0) {
      // Cut: it spins up and away
      axe.gone += dt;
      const k = Math.min(1, axe.gone / 0.7);
      axe.tool.rotation.z = -k * Math.PI * 3;
      axe.tool.position.y = 1.05 + k * 1.6;
      axe.tool.scale.setScalar(Math.max(0.01, 1 - k));
      return;
    }
    axe.tool.rotation.z = Math.sin(time * 2) * 0.12;
    axe.tool.rotation.y = Math.sin(time * 1.3) * 0.25;
  }

  function placeAdmin(dt, time) {
    const a = admin;
    a.group.position.set(boss.x, boss.y, 0.1);
    a.group.visible = boss.y > LAVA_Y - ADMIN_TOP - 0.4;
    const facing = boss.facing;
    // Lean toward the guinea pig; squash in the crouch, stretch in the air
    boss.lean += (facing * 0.12 - boss.lean) * Math.min(1, dt * 6);
    a.body.rotation.z = -boss.lean;
    let sy = 1;
    let arm = 0.25;
    let legs = 0;
    let wave = 0;
    let bob = 0;
    if (boss.state === "crouch") {
      sy = 1 - 0.18 * Math.min(1, boss.t / ADMIN_CROUCH_S);
    } else if (boss.state === "air") {
      sy = 1.06;
      arm = 2.4;
    } else if (boss.state === "walk") {
      legs = Math.sin(time * 7) * 0.45;
    } else if (boss.state === "windup") {
      arm = boss.high ? 2.3 : 1.2;
    } else if (boss.state === "hang") {
      legs = Math.sin(time * 26) * 0.7;
      wave = Math.sin(time * 22) * 0.5;
      arm = 2.6;
    } else if (boss.state === "drop") {
      legs = Math.sin(time * 18) * 0.5;
      wave = Math.sin(time * 16) * 0.4;
      arm = 2.9;
    } else if (boss.phase === "talk") {
      // Telling the guinea pig about his Flow: one arm waving
      wave = Math.sin(time * 6) * 0.35;
      arm = 1.6;
    } else {
      bob = Math.sin(time * 3) * 0.02;
    }
    a.body.position.y = bob;
    a.body.scale.set(1 + (1 - sy) * 0.6, sy, 1);
    a.legs[0].rotation.x = legs;
    a.legs[1].rotation.x = -legs;
    // The arm toward the guinea pig throws; the other one waves or hangs
    const front = facing < 0 ? a.arms[0] : a.arms[1];
    const back = facing < 0 ? a.arms[1] : a.arms[0];
    front.rotation.z = facing < 0 ? -arm : arm;
    back.rotation.z = facing < 0 ? 0.25 + wave : -0.25 - wave;
    if (boss.state === "hang" || boss.state === "drop") {
      back.rotation.z = facing < 0 ? 2.6 + wave : -2.6 - wave;
      a.group.rotation.z = Math.sin(time * 9) * 0.12;
    } else {
      a.group.rotation.z = 0;
    }
    // The Flow in his hand while he winds up, where it will fly
    if (boss.state === "windup") {
      const k = Math.min(1, boss.t / WINDUP_S);
      heldFlow.visible = true;
      heldFlow.position.set(boss.x + facing * 1.0, boss.high ? FLOW_HIGH : FLOW_LOW, 0.35);
      heldFlow.scale.setScalar(0.3 + 0.7 * k + Math.sin(time * 30) * 0.05 * k);
      heldFlow.rotation.z = time * 4;
    }
    if (screamBubble.visible) {
      // Over his head, kept inside the view: a phone is narrow
      const half = (camera.position.z - 0.6) * Math.tan((camera.fov * Math.PI) / 360) * camera.aspect;
      const room = Math.max(0, half - screamBubble.scale.x / 2 - 0.15);
      const x = Math.min(Math.max(boss.x + 0.9, camera.position.x - room), camera.position.x + room);
      screamBubble.position.set(x, Math.max(LAVA_Y + 3.4, boss.y + ADMIN_TOP + 1.2), 0.6);
    }
  }

  function placeFlows(time) {
    let n = 0;
    for (const f of flows) {
      if (!f.live) {
        continue;
      }
      const y = f.y + Math.sin(f.age * 9) * 0.04;
      const back = -Math.sign(f.vx);
      for (let k = 0; k <= FLOW_TRAIL; k++) {
        // The Flow itself, then its trail of smaller ones behind
        const s = k === 0 ? 1 : Math.pow(0.68, k);
        cp.set(f.x + back * k * 0.3, y + (k ? Math.sin(f.age * 9 - k) * 0.05 : 0), 0.3 - k * 0.02);
        ce.set(0, 0, k === 0 ? Math.sin(f.age * 5) * 0.25 : time * 3 + k);
        cq.setFromEuler(ce);
        cs.set(s, s, s);
        cm.compose(cp, cq, cs);
        flowMesh.setMatrixAt(n, cm);
        n += 1;
      }
    }
    flowMesh.count = n;
    flowMesh.instanceMatrix.needsUpdate = true;
  }

  /** The admin from boxes and capsules, his face from its SVG, a Flow on his hoodie. */
  function buildAdmin() {
    const group = new THREE.Group();
    const body = new THREE.Group();
    group.add(body);
    root.add(group);
    const hoodie = paint.plain(0x16325c, { roughness: 0.75 });
    const jeans = paint.plain(0x34507e, { roughness: 0.8 });
    const shoe = paint.plain(0x161616, { roughness: 0.6 });
    const skin = paint.plain(0xe2ad86, { roughness: 0.7 });
    const torsoGeometry = paint.geometry("w1-admin-torso", () => new THREE.CapsuleGeometry(0.5, 0.6, 6, 16));
    const limbGeometry = paint.geometry("w1-admin-limb", () => new THREE.CapsuleGeometry(0.15, 0.5, 4, 10));
    const handGeometry = paint.geometry("w1-admin-hand", () => new THREE.SphereGeometry(0.15, 12, 8));
    const legs = [-1, 1].map((side) => {
      const hip = new THREE.Group();
      hip.position.set(side * 0.24, 0.62, 0);
      const leg = new THREE.Mesh(limbGeometry, jeans);
      leg.scale.set(1.25, 0.8, 1.25);
      leg.position.y = -0.31;
      const foot = new THREE.Mesh(unit, shoe);
      foot.scale.set(0.34, 0.16, 0.52);
      foot.position.set(0, -0.56, 0.08);
      hip.add(leg, foot);
      body.add(hip);
      return hip;
    });
    const torso = new THREE.Mesh(torsoGeometry, hoodie);
    torso.scale.set(1.3, 0.6, 0.86);
    torso.position.y = 1.1;
    body.add(torso);
    // His love: a Flow on the chest
    const badge = new THREE.Mesh(paint.geometry("w1-admin-badge", () => new THREE.CircleGeometry(0.24, 28)), keep(new THREE.MeshBasicMaterial({ map: paint.texture("w1-admin-badge", 128, 128, drawFlowBadge), toneMapped: false })));
    badge.position.set(0, 1.08, 0.445);
    body.add(badge);
    const arms = [-1, 1].map((side) => {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.66, 1.42, 0);
      const arm = new THREE.Mesh(limbGeometry, hoodie);
      arm.position.y = -0.36;
      const hand = new THREE.Mesh(handGeometry, skin);
      hand.position.y = -0.74;
      shoulder.add(arm, hand);
      body.add(shoulder);
      return shoulder;
    });
    const neck = new THREE.Mesh(paint.geometry("w1-admin-neck", () => new THREE.CylinderGeometry(0.16, 0.18, 0.2, 12)), skin);
    neck.position.y = 1.62;
    body.add(neck);
    // His face in a round frame, drawn plain until it loads
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext("2d");
    drawAdminPlain(context, 256);
    const texture = keep(new THREE.CanvasTexture(canvas));
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      if (!disposed) {
        drawAdminFramed(context, image, 256);
        texture.needsUpdate = true;
      }
    };
    image.onerror = () => {};
    image.src = ADMIN_FACE_URL;
    const face = new THREE.Mesh(paint.geometry("w1-admin-face", () => new THREE.CircleGeometry(0.62, 44)), keep(new THREE.MeshBasicMaterial({ map: texture, alphaTest: 0.5, toneMapped: false })));
    // Big and in front, readable on a phone
    face.position.set(0, ADMIN_TOP - 0.62, 0.47);
    face.renderOrder = 1;
    body.add(face);
    group.traverse((child) => {
      if (child.isMesh && child !== face && child !== badge) {
        child.castShadow = shadows;
      }
    });
    return { group, body, legs, arms, face };
  }

  /* ---------- Drawing each step ---------- */

  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const scale = new THREE.Vector3();
  const position = new THREE.Vector3();
  let camX = player.x + 2;
  let camY = player.y + 1.4;

  const work = new THREE.Matrix4();

  function placeVegetables(time) {
    for (const v of vegetables) {
      position.set(v.x, v.y - VEGETABLE_HEIGHT / 2 + Math.sin(time * 3 + v.x) * 0.06, 0.2);
      euler.set(0, time * 2.2 + v.x, 0);
      quaternion.setFromEuler(euler);
      const s = v.done ? 0 : 1;
      scale.set(s, s, s);
      matrix.compose(position, quaternion, scale);
      for (const part of vegetablePools[v.kind]) {
        work.multiplyMatrices(matrix, part.local);
        part.mesh.setMatrixAt(v.slot, work);
      }
    }
    for (const kind of VEGETABLES) {
      for (const part of vegetablePools[kind]) {
        part.mesh.instanceMatrix.needsUpdate = true;
      }
    }
  }

  /** A vegetable: bonus points and a happy wheek, its name the first time each kind is eaten. */
  function eatVegetable(v) {
    v.done = true;
    if (v.label) {
      v.label.visible = false;
    }
    eaten += 1;
    ctx.collect(VEGETABLE_POINTS, eatenKinds.has(v.kind) ? "" : t("veg_" + v.kind));
    eatenKinds.add(v.kind);
    ctx.sound.play("wheek");
    // Told once, when no other instruction is on screen
    if (!vegTold && engine.time - coachAt > 3) {
      vegTold = true;
      coach("coachVeg", true);
    }
    renderBar();
  }

  function placeParts(dt, time) {
    const before = nextPart;
    updateNext();
    if (nextPart !== before) {
      renderBar();
    }
    for (const part of parts) {
      const next = part.index === nextPart;
      if (part.flying > 0) {
        part.flying += dt;
        const k = part.flying / 0.45;
        part.group.position.y = part.y + k * 1.4;
        part.group.scale.setScalar(Math.max(0.01, 1 - k));
        if (k >= 1) {
          part.group.visible = false;
          part.flying = 0;
        }
        continue;
      }
      if (part.done) {
        continue;
      }
      const glow = next ? 1 : 0.38;
      part.labelMaterial.opacity = glow;
      part.tileMaterial.opacity = glow;
      if (part.tile) {
        part.tile.scale.setScalar(next ? 1.15 : 0.8);
        part.tile.rotation.y = next ? Math.sin(time * 2.4) * 0.5 : 0;
        part.group.position.y = part.y + (next ? Math.sin(time * 4) * 0.08 : 0);
      }
    }
    const target = parts[nextPart];
    halo.visible = Boolean(target);
    if (target) {
      halo.position.set(target.x, target.y, 0.35);
      halo.scale.setScalar((target.kind === "meta" ? 1.2 : 1) + Math.sin(time * 6) * 0.1);
      halo.rotation.z = time;
    }
    for (const r of refreshes) {
      r.group.rotation.y = time * 2;
    }
    note.group.rotation.y = time * 2.5;
    for (const cp of checkpoints) {
      if (cp.star && cp.star.visible) {
        cp.star.rotation.y = time * 2;
      }
    }
    decoy.position.y = DECOY_Y + Math.sin(time * 3) * 0.06;
  }

  function placePig(dt, time) {
    const wantTurn = player.facing > 0 ? -Math.PI / 2 : Math.PI / 2;
    player.turn += (wantTurn - player.turn) * Math.min(1, dt * 14);
    pig.object.position.set(player.x, player.y, 0);
    pig.object.rotation.set(0, player.turn, 0);
    // Squash on landing, stretch on take-off
    player.squash += (0 - player.squash) * Math.min(1, dt * 10);
    const s = player.squash;
    // Giant: the whole guinea pig, whatever its model; a quick throb when it is about to shrink
    const warn = giant.left > 0 && giant.left < GIANT_WARN_S ? 1 + Math.sin(time * 28) * 0.05 : 1;
    const size = giant.size * warn;
    pig.object.scale.set((1 + s * 0.6) * size, (1 - s) * size, (1 + s * 0.6) * size);
    pig.hitWobble(player.hit);
    pig.object.visible = !(player.inv > 0 && Math.floor(time * 12) % 2 === 0);
    // The shadow on whatever is below
    let floor = null;
    for (const p of platforms) {
      if (solid(p) && player.x > p.x0 - 0.1 && player.x < p.x1 + 0.1 && p.top <= player.y + 0.02 && (!floor || p.top > floor.top)) {
        floor = p;
      }
    }
    pig.shadow.visible = Boolean(floor) && !ghost;
    if (floor) {
      pig.shadow.position.set(player.x, floor.top + 0.012, 0.05);
    }
    pig.state = { running: player.grounded && Math.abs(player.vx) > 0.6, airborne: !player.grounded, ducking: false, speed: Math.abs(player.vx), height: floor ? player.y - floor.top : 2 };
    if (dustTime > 0) {
      dustTime = Math.max(0, dustTime - dt);
      const k = 1 - dustTime / 0.35;
      dust.scale.setScalar(1 + k * 1.6);
      dustMaterial.opacity = 0.6 * (1 - k);
    } else {
      dustMaterial.opacity = 0;
    }
  }

  function placeCamera(dt) {
    const portrait = engine.portrait;
    const lead = portrait ? 1.2 : 2.4;
    const ease = Math.min(1, dt * 4);
    let targetX = player.x + player.facing * lead;
    let groundY = player.grounded ? player.y : Math.min(player.y, camY - 1.4);
    if (castle.k > 0.001) {
      // In the castle the view holds the bridge: between the guinea pig and the
      // admin, the guinea pig always on screen, steady through the jumps
      const falling = boss.phase === "fall" || boss.phase === "down";
      const room = Math.max(player.x - (falling ? 3 : 1), Math.min((player.x + boss.x) / 2, player.x + castleLead()));
      targetX += (room - targetX) * castle.k;
      groundY += (BRIDGE_TOP + (falling ? -0.6 : 0.7) - groundY) * castle.k;
    }
    camX += (targetX - camX) * ease;
    camY += (Math.max(groundY, -2) + 1.4 - camY) * Math.min(1, dt * 2.5);
    shake = Math.max(0, shake - dt);
    const jitter = shake > 0 ? (Math.random() - 0.5) * shake : 0;
    camera.fov = (portrait ? 64 : 46) + (pace - 1) * 10;
    camera.updateProjectionMatrix();
    // A giant guinea pig: the camera steps back and up a little, so it stays on
    // screen; in the castle a little more, so the Flows are seen coming
    const grown = giant.size - 1;
    const distance = (portrait ? 13 : 12.5) * (1 + grown * 0.32) * (1 + castle.k * (portrait ? 0.24 : 0.18));
    camera.position.set(camX + jitter, camY + (portrait ? 2.4 : 1.6) + grown * 0.9, distance);
    camera.lookAt(camX, camY + (portrait ? 0.8 : 0.4) + grown * 0.6, 0);
    engine.aimSun(player.x, 0);
  }

  // The intro card shows the start, with the guinea pig facing the way to go
  pig.object.rotation.set(0, -Math.PI / 2, 0);
  pig.shadow.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
  movePlatforms(0);
  ctx.setData("pace", "1.00");
  placeVegetables(0);
  placeParts(0, 0);
  placePig(0, 0);
  ctx.setData("visible", ghost ? "no" : "yes");
  ctx.setData("giant", "off");
  placeMushrooms(0, 0);
  renderBar();
  // Customer Tier on the record, still empty (or done, on a try that starts in the castle)
  recordPlatform.record.draw(recordAt < 0 ? (ghost ? null : "Gold") : "");
  placeCastle(0, 0);
  if (castle.k === 1) {
    // Starting in the castle: the view already holds the bridge
    camX = Math.min((player.x + boss.x) / 2, player.x + castleLead());
    camY = BRIDGE_TOP + 2.1;
  }
  ctx.setData("x", Math.round(player.x));
  ctx.setData("boss", boss.phase);
  ctx.setData("flows", 0);

  return {
    start() {
      releaseAll();
      hud.setPath([t("path0"), t("path1"), t("path2"), t("path3")], checkpoints[checkpoint].path);
      pathIndex = checkpoints[checkpoint].path;
      hud.tick(t("target"));
      lastGoal = "";
      renderBar();
      // A try that starts in the castle hears the castle's own lines instead
      if (startAt < BOSS_CHECK_X) {
        coach("c_start", true);
      }
    },
    update(dt, time) {
      if (!ctx.playing) {
        return;
      }
      clock += dt;
      if (autoplay) {
        autopilot();
      }
      updatePace(dt);
      movePlatforms(dt);
      updateGiant(dt);
      stepPlayer(dt);
      dropTraps(dt);
      touch(time);
      if (!ctx.playing) {
        return;
      }
      updateCastle(dt);
      if (!ctx.playing) {
        return;
      }
      if (twistAt && engine.time >= twistAt) {
        twistAt = 0;
        setGhost(true);
        ghostSign.visible = true;
        hud.toast(t("ghost"), "bad");
        hud.tick(t("ghostTick"));
        coach("c_ghost", true);
        ctx.sound.play("wrong");
        shake = engine.motion ? 0.25 : 0;
      }
      // In the castle the drop is the lava, much nearer than the clouds
      const inCastle = player.x > CASTLE_X0 && player.x < WALL_X0;
      if (player.y < (inCastle ? LAVA_Y + 0.1 : FALL_Y)) {
        fell();
        if (!ctx.playing) {
          return;
        }
      }
      placeVegetables(time);
      placeMushrooms(dt, time);
      placeParts(dt, time);
      placeCastle(dt, time);
      placePig(dt, time);
      placeCamera(dt);
      ctx.setData("x", Math.round(player.x));
      ctx.setData("y", player.y.toFixed(1));
      // For checks: where things are, so a scripted run can time its jumps
      ctx.setData("xf", player.x.toFixed(2));
      ctx.setData("ground", player.grounded ? 1 : 0);
      ctx.setData("lift", lift.top.toFixed(2));
      // A smashed validation rule is gone: the nearest one still standing
      const near = hazards.filter((h) => !h.smashed).reduce((best, h) => (!best || Math.abs(h.cx - player.x) < Math.abs(best.cx - player.x) ? h : best), null);
      ctx.setData("hz", near ? near.cx.toFixed(2) + "," + near.bottom.toFixed(2) : "999,0");
      ctx.setData("smashed", giant.smashed);
      ctx.setData("checkpoint", checkpoint);
      ctx.setData("admin", boss.state);
      ctx.setData("ax", boss.x.toFixed(2));
      // The admin in the lava, the prize up: then the result
      if (boss.phase === "down" && clock - boss.downAt > FINISH_S) {
        const missed = missedInfo();
        hud.goal("");
        // Everything built and visible again: the full bonus. Each part missed costs a little
        const complete = missed.count === 0 && !ghost;
        ctx.finish(Math.max(0, 200 + (complete ? 300 : 0) - missed.count * 20), missed.text);
      }
    },
    action(name) {
      if (name === "jump" || name === "tap") {
        // A key or a pad cuts the jump when let go; a tap or a swipe up has no release: a full jump
        player.buffer = BUFFER_S;
      } else if (name === "left" || name === "right") {
        nudge[name] = NUDGE_S;
        nudge[name === "left" ? "right" : "left"] = 0;
      }
    },
    idleCamera(time) {
      const portrait = engine.portrait;
      camera.fov = portrait ? 64 : 46;
      camera.updateProjectionMatrix();
      const sway = Math.sin(time * 0.4) * 0.8;
      camera.position.set(player.x + 2 + sway, player.y + (portrait ? 4 : 3), portrait ? 14.5 : 11.5);
      camera.lookAt(player.x + 2.5, player.y + (portrait ? 1.5 : 1), 0);
      engine.aimSun(player.x, 0);
    },
    dispose() {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("keyup", onKey, true);
      window.removeEventListener("blur", releaseAll);
      overlay.removeEventListener("pointerdown", onPadDown, true);
      window.removeEventListener("pointerup", onPadUp, true);
      window.removeEventListener("pointercancel", onPadUp, true);
      pig.animate = shellAnimate;
      pig.object.scale.set(1, 1, 1);
      pig.shadow.rotation.set(-Math.PI / 2, 0, 0);
      pig.shadow.visible = true;
      for (const kind of VEGETABLES) {
        for (const part of vegetablePools[kind]) {
          part.mesh.dispose();
        }
      }
      clouds.dispose();
      for (const thing of disposables) {
        thing.dispose();
      }
      disposed = true;
      MUSIC = 1;
      if (window.__guineaRun && window.__guineaRun.w1 === hooks) {
        delete window.__guineaRun.w1;
      }
      talk.remove();
      bar.remove();
      hud.goal("");
      hud.setPath([], 0);
    }
  };

  /** The mushroom drawn by the world itself, if the vegetables pack did not load: centred on its middle. */
  function mushroomShape() {
    const holder = new THREE.Group();
    const cap = new THREE.Mesh(paint.geometry("w1-mushroom-cap", () => new THREE.SphereGeometry(0.38, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2)), paint.plain(0xe8231a, { roughness: 0.3 }));
    cap.scale.y = 0.85;
    cap.position.y = 0.0;
    const stalk = new THREE.Mesh(paint.geometry("w1-mushroom-stalk", () => new THREE.CylinderGeometry(0.15, 0.17, 0.36, 14)), paint.plain(0xfaecc8, { roughness: 0.5 }));
    stalk.position.y = -0.18;
    holder.add(cap, stalk);
    return holder;
  }

  /* ---------- Canvas pictures ---------- */

  /** The account Acme Corp: its column of fields, Customer Tier with its value (null: no row, nobody grants it). */
  function recordTexture(w, h) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.min(2048, Math.round(w * 110));
    canvas.height = Math.round(h * 110);
    const texture = keep(new THREE.CanvasTexture(canvas));
    texture.colorSpace = THREE.SRGBColorSpace;
    const c = canvas.getContext("2d");
    function draw(n) {
      const cw = canvas.width;
      const ch = canvas.height;
      const u = ch / 100;
      c.clearRect(0, 0, cw, ch);
      c.fillStyle = SLDS.white;
      c.fillRect(0, 0, cw, ch);
      c.fillStyle = SLDS.warningDark;
      c.fillRect(0, 0, cw, 3 * u);
      // The record header
      rounded(c, 3 * u, 8 * u, 18 * u, 18 * u, 3 * u);
      c.fill();
      glyph(c, "box", 12 * u, 17 * u, 17 * u);
      c.fillStyle = SLDS.weak;
      c.textAlign = "left";
      c.textBaseline = "middle";
      fitText(c, "Account", 25 * u, 11 * u, cw * 0.3, 7 * u, "400");
      c.fillStyle = SLDS.text;
      fitText(c, "Acme Corp", 25 * u, 21 * u, cw * 0.3, 11 * u, "800");
      // The column of fields
      const fields = [
        ["Type", "Customer"],
        ["Industry", "Manufacturing"]
      ];
      if (n !== null) {
        fields.push(["Customer Tier", String(n)]);
      }
      fields.forEach(([name, value], i) => {
        const y = 42 * u + i * 19 * u;
        const last = i === 2;
        if (last) {
          rounded(c, 2 * u, y - 8 * u, cw * 0.44, 16 * u, 3 * u);
          c.fillStyle = "#EEF4FF";
          c.fill();
        }
        c.fillStyle = SLDS.weak;
        fitText(c, name, 5 * u, y, cw * 0.18, 8 * u, last ? "800" : "400");
        c.fillStyle = last ? SLDS.brand : SLDS.text;
        fitText(c, value, cw * 0.26, y, cw * 0.17, (last ? 11 : 8) * u, "800");
      });
      // The small i of the help text, next to the name
      if (n !== null) {
        const iy = 42 * u + 2 * 19 * u;
        c.beginPath();
        c.arc(cw * 0.215, iy, 3.5 * u, 0, Math.PI * 2);
        c.strokeStyle = SLDS.grey;
        c.lineWidth = Math.max(2, 0.8 * u);
        c.stroke();
        c.fillStyle = SLDS.grey;
        font(c, 5 * u, "800");
        c.textAlign = "center";
        c.fillText("i", cw * 0.215, iy + 0.5 * u);
      }
      // The values of the picklist on the right, the chosen one filled
      c.textAlign = "left";
      c.fillStyle = SLDS.text;
      fitText(c, "Customer Tier values", cw * 0.52, 14 * u, cw * 0.4, 9 * u, "700");
      ["Bronze", "Silver", "Gold"].forEach((value, i) => {
        const x = cw * 0.52 + i * cw * 0.15;
        const chosen = value === n;
        rounded(c, x, 30 * u, cw * 0.13, 26 * u, 4 * u);
        c.fillStyle = chosen ? SLDS.brand : "#EEF4FF";
        c.fill();
        c.fillStyle = chosen ? SLDS.white : SLDS.navy;
        fitText(c, value, x + 3 * u, 43 * u, cw * 0.11, 10 * u, "800");
      });
      texture.needsUpdate = true;
    }
    return { texture, draw };
  }
}

/** The front of a platform: the screen element it stands for. */
function drawFront(c, w, h, def) {
  const look = def.look;
  const text = def.text;
  c.textBaseline = "middle";
  if (look === "vscode") {
    c.fillStyle = "#1F1F1F";
    c.fillRect(0, 0, w, h);
    c.fillStyle = SLDS.brand;
    c.fillRect(0, 0, w, 6);
    c.fillStyle = "#E5E5E5";
    c.textAlign = "left";
    fitText(c, text, 24, h * 0.36, w * 0.6, 40, "700");
    if (def.sub) {
      c.fillStyle = "#9DA5B4";
      fitText(c, def.sub, 24, h * 0.72, w * 0.8, 28, "400");
    }
    return;
  }
  if (look === "button") {
    c.fillStyle = def.big ? SLDS.brandDark : SLDS.brand;
    c.fillRect(0, 0, w, h);
    c.fillStyle = SLDS.white;
    c.textAlign = "center";
    fitText(c, text, w / 2, h / 2 + 2, w * 0.86, def.big ? 56 : 46, "800");
    return;
  }
  if (look === "branch") {
    c.fillStyle = SLDS.success;
    c.fillRect(0, 0, w, h);
    glyph(c, "branch", 44, h / 2, 60);
    c.fillStyle = SLDS.white;
    c.textAlign = "left";
    fitText(c, text, 84, h / 2 + 2, w - 100, 38, "700", true);
    return;
  }
  if (look === "stone") {
    drawBricks(c, w, h, 54);
    return;
  }
  c.fillStyle = SLDS.white;
  c.fillRect(0, 0, w, h);
  c.strokeStyle = SLDS.border;
  c.lineWidth = 4;
  c.strokeRect(2, 2, w - 4, h - 4);
  c.textAlign = "left";
  switch (look) {
    case "meta":
      // A metadata the story creates or updates: its type, then its API name
      c.fillStyle = SLDS.purple;
      c.fillRect(0, 0, 12, h);
      c.fillStyle = SLDS.grey;
      fitText(c, def.sub, 30, h * 0.3, w - 50, 24, "700");
      c.fillStyle = SLDS.text;
      fitText(c, text, 30, h * 0.66, w - 50, 34, "800", true);
      return;
    case "row":
      c.fillStyle = def.hot ? SLDS.brand : SLDS.border;
      c.fillRect(0, 0, 10, h);
      if (def.sub) {
        c.fillStyle = SLDS.grey;
        fitText(c, def.sub, 26, h * 0.3, w * 0.4, 20, "700");
      }
      c.fillStyle = def.hot ? SLDS.brand : SLDS.text;
      fitText(c, text, 26, def.sub ? h * 0.64 : h / 2, w - 40, 36, "700");
      return;
    case "answer":
    case "radio":
      c.beginPath();
      c.arc(34, h / 2, 14, 0, Math.PI * 2);
      c.strokeStyle = SLDS.grey;
      c.lineWidth = 4;
      c.stroke();
      if (def.hot) {
        c.beginPath();
        c.arc(34, h / 2, 7, 0, Math.PI * 2);
        c.fillStyle = SLDS.brand;
        c.fill();
      }
      c.fillStyle = SLDS.text;
      fitText(c, text, 62, h / 2 + 2, w - 76, 32, "600");
      return;
    case "input":
      c.fillStyle = SLDS.grey;
      fitText(c, def.sub || "", 18, h * 0.26, w - 36, 20, "700");
      c.strokeStyle = SLDS.border;
      c.lineWidth = 3;
      rounded(c, 14, h * 0.44, w - 28, h * 0.44, 6);
      c.stroke();
      c.fillStyle = SLDS.text;
      fitText(c, text, 26, h * 0.67, w - 52, 26, "600");
      return;
    case "check":
    case "header": {
      const box = Math.min(h * 0.5, 40);
      const x = look === "header" || !text ? (w - box) / 2 : 18;
      drawCheckbox(c, x, (look === "header" ? h * 0.62 : h / 2) - box / 2, box, !def.unticked && look !== "header");
      c.fillStyle = SLDS.text;
      if (look === "header") {
        c.textAlign = "center";
        fitText(c, text, w / 2, h * 0.22, w - 12, 24, "800");
      } else if (text) {
        fitText(c, text, x + box + 14, h / 2 + 2, w - box - 40, 32, "700");
      }
      return;
    }
    case "fls":
      c.fillStyle = SLDS.grey;
      fitText(c, def.sub, 18, h * 0.3, w * 0.4, 20, "700");
      c.fillStyle = SLDS.text;
      fitText(c, text, 18, h * 0.66, w * 0.4, 30, "700");
      c.fillStyle = SLDS.grey;
      fitText(c, "Read Access", w * 0.5, h * 0.3, w * 0.22, 20, "700");
      fitText(c, "Edit Access", w * 0.75, h * 0.3, w * 0.22, 20, "700");
      drawCheckbox(c, w * 0.5, h * 0.48, 30, false);
      drawCheckbox(c, w * 0.75, h * 0.48, 30, false);
      return;
    default:
      c.fillStyle = SLDS.brand;
      c.fillRect(0, 0, w, 8);
      c.fillStyle = SLDS.text;
      fitText(c, text, 20, h / 2 + 3, w - 40, 36, "700");
  }
}

function drawCheckbox(c, x, y, size, ticked) {
  rounded(c, x, y, size, size, size * 0.18);
  c.fillStyle = ticked ? SLDS.brand : SLDS.white;
  c.fill();
  c.strokeStyle = ticked ? SLDS.brand : SLDS.grey;
  c.lineWidth = Math.max(2, size * 0.08);
  c.stroke();
  if (ticked) {
    glyph(c, "check", x + size / 2, y + size / 2, size * 1.1);
  }
}

/** The page behind a stretch of the level: a VS Code panel or a Lightning page. */
function drawScreen(c, w, h, look, eyebrow, title) {
  if (look === "vscode") {
    c.fillStyle = "#1E1E1E";
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#2D2D2D";
    c.fillRect(0, 0, w, 44);
    c.fillStyle = "#1F1F1F";
    c.fillRect(16, 6, Math.min(w * 0.5, 420), 38);
    c.fillStyle = SLDS.brand;
    c.fillRect(16, 6, Math.min(w * 0.5, 420), 3);
    c.fillStyle = "#CCCCCC";
    c.textAlign = "left";
    c.textBaseline = "middle";
    fitText(c, eyebrow, 30, 26, Math.min(w * 0.5, 420) - 28, 20, "600");
    c.fillStyle = "#FFFFFF";
    fitText(c, title, 30, 86, w - 60, 38, "700");
    c.fillStyle = "rgba(255,255,255,0.06)";
    for (let y = 130; y < h - 20; y += 34) {
      c.fillRect(30, y, w * (0.3 + ((y * 7) % 40) / 100), 14);
    }
    return;
  }
  const accent = look === "ghost" ? SLDS.purple : look === "record" ? SLDS.warningDark : SLDS.brand;
  c.fillStyle = look === "ghost" ? "#ECE6F8" : "#F3F3F3";
  c.fillRect(0, 0, w, h);
  // The global header and the navigation bar
  c.fillStyle = SLDS.white;
  c.fillRect(0, 0, w, 40);
  c.fillStyle = accent;
  c.fillRect(0, 40, w, 6);
  c.fillStyle = SLDS.brand;
  c.beginPath();
  c.arc(30, 20, 13, 0, Math.PI * 2);
  c.fill();
  // The page header card
  rounded(c, 14, 60, w - 28, 76, 10);
  c.fillStyle = SLDS.white;
  c.fill();
  c.strokeStyle = SLDS.border;
  c.lineWidth = 2;
  c.stroke();
  rounded(c, 28, 72, 52, 52, 8);
  c.fillStyle = accent;
  c.fill();
  glyph(c, look === "ghost" ? "permset" : look === "record" ? "box" : "gear", 54, 98, 50);
  c.textAlign = "left";
  c.textBaseline = "middle";
  c.fillStyle = SLDS.weak;
  fitText(c, eyebrow, 94, 84, w - 130, 18, "600");
  c.fillStyle = SLDS.text;
  fitText(c, title, 94, 112, w - 130, 30, "800");
  // The body: faint rows of a list
  c.fillStyle = "rgba(255,255,255,0.7)";
  rounded(c, 14, 150, w - 28, h - 170, 10);
  c.fill();
  c.fillStyle = "rgba(201,201,201,0.5)";
  for (let y = 176; y < h - 40; y += 30) {
    c.fillRect(30, y, w - 60, 2);
  }
}

/** The ? block: gold with a big question mark, or dull brown once used. */
function drawBlock(c, w, h, used) {
  c.fillStyle = used ? "#9c6b3a" : "#f4b324";
  c.fillRect(0, 0, w, h);
  c.strokeStyle = used ? "#6e4522" : "#a86a00";
  c.lineWidth = 8;
  c.strokeRect(4, 4, w - 8, h - 8);
  // The four rivets
  c.fillStyle = used ? "#6e4522" : "#a86a00";
  for (const [x, y] of [[18, 18], [w - 18, 18], [18, h - 18], [w - 18, h - 18]]) {
    c.beginPath();
    c.arc(x, y, 6, 0, Math.PI * 2);
    c.fill();
  }
  if (!used) {
    c.textAlign = "center";
    c.textBaseline = "middle";
    font(c, 92, "800");
    c.fillStyle = "#a86a00";
    c.fillText("?", w / 2 + 4, h / 2 + 8);
    c.fillStyle = "#ffffff";
    c.fillText("?", w / 2, h / 2 + 4);
  }
}

/* ---------- The castle's pictures ---------- */

/** Castle stone: rows of bricks, each a little different, dark mortar between. */
function drawBricks(c, w, h, row) {
  c.fillStyle = "#2c2832";
  c.fillRect(0, 0, w, h);
  const tones = ["#5d5766", "#555060", "#625b6b", "#4f4a58", "#58525f"];
  const brick = row * 2;
  for (let y = 0, r = 0; y < h; y += row, r++) {
    for (let x = r % 2 ? -brick / 2 : 0, i = 0; x < w; x += brick, i++) {
      c.fillStyle = tones[(r * 3 + i * 7) % tones.length];
      c.fillRect(x + 3, y + 3, brick - 6, row - 6);
      // A lighter top edge: the light comes from above
      c.fillStyle = "rgba(255, 255, 255, 0.07)";
      c.fillRect(x + 3, y + 3, brick - 6, 4);
    }
  }
}

/** The bridge's planks: warm wood, dark joints, two nails. */
function drawPlank(c, w, h) {
  c.fillStyle = "#a86a32";
  c.fillRect(0, 0, w, h);
  c.fillStyle = "#c4834a";
  c.fillRect(0, 0, w, h * 0.28);
  c.strokeStyle = "rgba(70, 35, 10, 0.45)";
  c.lineWidth = 3;
  for (const y of [0.45, 0.7]) {
    c.beginPath();
    c.moveTo(0, h * y);
    c.bezierCurveTo(w * 0.3, h * y - 4, w * 0.7, h * y + 4, w, h * y);
    c.stroke();
  }
  c.fillStyle = "#5a3412";
  c.fillRect(0, 0, 6, h);
  c.fillRect(w - 6, 0, 6, h);
  c.fillStyle = "#3a3a40";
  for (const x of [18, w - 18]) {
    c.beginPath();
    c.arc(x, h * 0.55, 4, 0, Math.PI * 2);
    c.fill();
  }
}

/** Lava: an orange sea, darker crusts drifting, bright veins. Tiles both ways. */
function drawLava(c, w, h) {
  c.fillStyle = "#f2581a";
  c.fillRect(0, 0, w, h);
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  // Drawn three times across each edge, so the tile has no seam
  const blob = (x, y, r, color) => {
    for (const ox of [-w, 0, w]) {
      for (const oy of [-h, 0, h]) {
        c.beginPath();
        c.ellipse(x + ox, y + oy, r, r * 0.6, 0, 0, Math.PI * 2);
        c.fillStyle = color;
        c.fill();
      }
    }
  };
  for (let i = 0; i < 12; i++) {
    blob(rnd() * w, rnd() * h, 18 + rnd() * 28, "rgba(150, 10, 20, 0.45)");
  }
  for (let i = 0; i < 16; i++) {
    blob(rnd() * w, rnd() * h, 4 + rnd() * 9, "rgba(255, 200, 70, 0.65)");
  }
}

/** The glow over the lava: bright at the bottom, gone at the top. */
function drawGlow(c, w, h) {
  const gradient = c.createLinearGradient(0, h, 0, 0);
  gradient.addColorStop(0, "rgba(255, 120, 30, 0.85)");
  gradient.addColorStop(0.35, "rgba(255, 70, 20, 0.35)");
  gradient.addColorStop(1, "rgba(255, 40, 0, 0)");
  c.fillStyle = gradient;
  c.fillRect(0, 0, w, h);
}

/** The sky over the castle: a dusk that fades in from the left. */
function drawDarkSky(c, w, h) {
  const gradient = c.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, "#1a1030");
  gradient.addColorStop(0.55, "#3a1d4a");
  gradient.addColorStop(1, "#7a2a2a");
  c.fillStyle = gradient;
  c.fillRect(0, 0, w, h);
  c.globalCompositeOperation = "destination-in";
  const fade = c.createLinearGradient(0, 0, w, 0);
  fade.addColorStop(0, "rgba(0, 0, 0, 0)");
  fade.addColorStop(0.22, "rgba(0, 0, 0, 1)");
  fade.addColorStop(1, "rgba(0, 0, 0, 1)");
  c.fillStyle = fade;
  c.fillRect(0, 0, w, h);
  c.globalCompositeOperation = "source-over";
}

/** A torch flame: a soft teardrop, yellow at its heart. */
function drawFlame(c, w, h) {
  const gradient = c.createRadialGradient(w / 2, h * 0.68, 2, w / 2, h * 0.62, h * 0.45);
  gradient.addColorStop(0, "rgba(255, 245, 200, 1)");
  gradient.addColorStop(0.3, "rgba(255, 190, 60, 0.95)");
  gradient.addColorStop(0.7, "rgba(255, 90, 20, 0.5)");
  gradient.addColorStop(1, "rgba(255, 60, 0, 0)");
  c.beginPath();
  c.moveTo(w / 2, 2);
  c.bezierCurveTo(w * 0.95, h * 0.5, w * 0.95, h * 0.95, w / 2, h - 2);
  c.bezierCurveTo(w * 0.05, h * 0.95, w * 0.05, h * 0.5, w / 2, 2);
  c.fillStyle = gradient;
  c.fill();
}

/**
 * The admin's monster Flow, open in Flow Builder: one Flow for everything,
 * hundreds of elements, connectors crossing everywhere.
 */
function drawMonsterFlow(c, w, h) {
  c.fillStyle = "#f3f3f3";
  c.fillRect(0, 0, w, h);
  // The dotted canvas
  c.fillStyle = "#d8dde6";
  for (let y = 70; y < h; y += 18) {
    for (let x = 8; x < w; x += 18) {
      c.fillRect(x, y, 2, 2);
    }
  }
  // The header
  c.fillStyle = SLDS.white;
  c.fillRect(0, 0, w, 56);
  c.fillStyle = SLDS.brand;
  c.fillRect(0, 56, w, 4);
  glyph(c, "flow", 34, 28, 40, SLDS.brand);
  c.textAlign = "left";
  c.textBaseline = "middle";
  c.fillStyle = SLDS.weak;
  fitText(c, "Flow Builder", 64, 20, 220, 18, "700");
  c.fillStyle = SLDS.text;
  fitText(c, "Account: Do Everything", 64, 40, 420, 22, "800");
  rounded(c, w - 230, 12, 214, 32, 16);
  c.fillStyle = SLDS.error;
  c.fill();
  c.fillStyle = SLDS.white;
  c.textAlign = "center";
  fitText(c, "412 elements", w - 123, 29, 190, 20, "800");
  // The elements: a start, then a tangle of decisions, assignments, loops and
  // record updates, every one linked to too many others
  let seed = 3;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const nodes = [];
  const cols = 13;
  const rows = 6;
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < cols; k++) {
      nodes.push({ x: 50 + k * ((w - 100) / (cols - 1)) + (rnd() - 0.5) * 30, y: 118 + r * ((h - 160) / (rows - 1)) + (rnd() - 0.5) * 22, kind: Math.floor(rnd() * 5) });
    }
  }
  c.strokeStyle = "rgba(112, 110, 107, 0.75)";
  c.lineWidth = 2;
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    for (const step of [1, cols, cols + 1 + Math.floor(rnd() * 9)]) {
      const b = nodes[(i + step) % nodes.length];
      c.beginPath();
      c.moveTo(a.x, a.y);
      c.bezierCurveTo(a.x, (a.y + b.y) / 2, b.x, (a.y + b.y) / 2, b.x, b.y);
      c.stroke();
    }
  }
  const COLORS = ["#FF8A3D", "#DD7A01", "#F9548A", "#0176D3", "#032D60"];
  for (const n of nodes) {
    c.fillStyle = COLORS[n.kind];
    c.beginPath();
    if (n.kind === 0) {
      // A decision: a diamond
      c.moveTo(n.x, n.y - 17);
      c.lineTo(n.x + 17, n.y);
      c.lineTo(n.x, n.y + 17);
      c.lineTo(n.x - 17, n.y);
      c.closePath();
    } else if (n.kind === 2) {
      c.arc(n.x, n.y, 15, 0, Math.PI * 2);
    } else {
      rounded(c, n.x - 14, n.y - 14, 28, 28, 6);
    }
    c.fill();
    c.fillStyle = SLDS.white;
    c.fillRect(n.x - 6, n.y - 1.5, 12, 3);
  }
  // The start, at the top
  c.beginPath();
  c.arc(w / 2, 86, 16, 0, Math.PI * 2);
  c.fillStyle = SLDS.success;
  c.fill();
}

/** A Flow the admin throws: the Flow icon in a red ring, in flames. */
function drawFlowBall(c, w) {
  const r = w / 2;
  const icon = r * 0.69;
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const reach = r * (i % 2 ? 0.86 : 0.99);
    c.beginPath();
    c.moveTo(r + Math.cos(a - 0.34) * icon, r + Math.sin(a - 0.34) * icon);
    c.quadraticCurveTo(r + Math.cos(a) * reach, r + Math.sin(a) * reach, r + Math.cos(a + 0.34) * icon, r + Math.sin(a + 0.34) * icon);
    c.closePath();
    c.fillStyle = i % 2 ? "#ffd24a" : "#ff7a1a";
    c.fill();
  }
  for (const [radius, color] of [
    [icon, "#ea001e"],
    [icon * 0.8, "#ffffff"],
    [icon * 0.68, "#0176d3"]
  ]) {
    c.beginPath();
    c.arc(r, r, radius, 0, Math.PI * 2);
    c.fillStyle = color;
    c.fill();
  }
  glyph(c, "flow", r, r, icon * 1.05, "#ffffff");
}

/** The Flow on the admin's hoodie. */
function drawFlowBadge(c, w) {
  const r = w / 2;
  c.beginPath();
  c.arc(r, r, r - 2, 0, Math.PI * 2);
  c.fillStyle = "#ffffff";
  c.fill();
  c.beginPath();
  c.arc(r, r, r * 0.84, 0, Math.PI * 2);
  c.fillStyle = "#0176d3";
  c.fill();
  glyph(c, "flow", r, r, r * 1.1, "#ffffff");
}

/** What he screams as he falls, in a comic bubble whose tail points down at him. */
function drawScream(c, w, h, text) {
  const body = h * 0.78;
  rounded(c, 6, 6, w - 12, body - 12, 44);
  c.fillStyle = "#ffffff";
  c.fill();
  c.lineWidth = 8;
  c.strokeStyle = "#ea001e";
  c.stroke();
  // The tail, toward the bottom left
  c.beginPath();
  c.moveTo(w * 0.2, body - 14);
  c.lineTo(w * 0.12, h - 4);
  c.lineTo(w * 0.36, body - 14);
  c.closePath();
  c.fillStyle = "#ffffff";
  c.fill();
  c.beginPath();
  c.moveTo(w * 0.2, body - 10);
  c.lineTo(w * 0.12, h - 4);
  c.lineTo(w * 0.36, body - 10);
  c.stroke();
  c.fillStyle = SLDS.navy;
  c.textAlign = "center";
  c.textBaseline = "middle";
  // As big as two lines allow: every word of the scream is shown
  let size = 58;
  let lines = [];
  for (; size >= 34; size -= 4) {
    font(c, size, "800");
    lines = wrapLines(c, text, w - 70);
    if (lines.length <= 2) {
      break;
    }
  }
  lines.forEach((line, i) => fitText(c, line, w / 2, body / 2 + (i - (lines.length - 1) / 2) * size * 1.12, w - 60, size, "800"));
}

/** The admin's face until his portrait loads, or if it never does: bald, bearded, cross. */
function drawAdminPlain(c, size) {
  const r = size / 2;
  c.save();
  c.beginPath();
  c.arc(r, r, r - 2, 0, Math.PI * 2);
  c.fillStyle = "#ffffff";
  c.fill();
  c.beginPath();
  c.arc(r, r, r * 0.9, 0, Math.PI * 2);
  c.clip();
  c.fillStyle = "#d6dde6";
  c.fillRect(0, 0, size, size);
  c.fillStyle = "#e2ad86";
  c.beginPath();
  c.ellipse(r, r * 0.92, r * 0.5, r * 0.58, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#5b4130";
  c.beginPath();
  c.ellipse(r, r * 1.28, r * 0.46, r * 0.34, 0, 0, Math.PI);
  c.fill();
  c.fillStyle = "#1a1a2e";
  for (const side of [-1, 1]) {
    c.fillRect(r + side * r * 0.2 - r * 0.07, r * 0.78, r * 0.14, r * 0.05);
    c.beginPath();
    c.arc(r + side * r * 0.2, r * 0.9, r * 0.055, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

/** His portrait, round, with a white ring. */
function drawAdminFramed(c, image, size) {
  const r = size / 2;
  c.clearRect(0, 0, size, size);
  c.save();
  c.beginPath();
  c.arc(r, r, r - 2, 0, Math.PI * 2);
  c.fillStyle = "#ffffff";
  c.fill();
  c.beginPath();
  c.arc(r, r, r * 0.92, 0, Math.PI * 2);
  c.clip();
  c.drawImage(image, size * 0.04, size * 0.04, size * 0.92, size * 0.92);
  c.restore();
}

export const CSS = `
.guinea-run .gr-w1-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  max-width: 720px;
  padding: 4px 8px;
  border: 1px solid #c9c9c9;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.95);
  font-size: 12px;
  pointer-events: none;
}
.guinea-run .gr-w1-count {
  padding: 2px 7px;
  border-radius: 999px;
  background: #e5e5e5;
  color: #181818;
  font-weight: 700;
  white-space: nowrap;
}
.guinea-run .gr-w1-veg {
  padding: 2px 7px;
  border-radius: 999px;
  background: #fff1d6;
  color: #8a4b00;
  font-weight: 800;
  white-space: nowrap;
}
.guinea-run .gr-w1-ghost {
  padding: 2px 7px;
  border-radius: 999px;
  background: #9050e9;
  color: #ffffff;
  font-weight: 700;
}
.guinea-run .gr-w1-ghost[hidden] {
  display: none;
}
.guinea-run .gr-w1-giant {
  padding: 2px 7px;
  border-radius: 999px;
  background: #e8231a;
  color: #ffffff;
  font-weight: 800;
  white-space: nowrap;
}
.guinea-run .gr-w1-giant[hidden] {
  display: none;
}
/* The talk before the castle fight: where the cast's chat bubbles go */
.guinea-run .gr-layer .gr-w1-talk {
  position: absolute;
  top: calc(env(safe-area-inset-top, 0px) + 64px);
  right: calc(env(safe-area-inset-right, 0px) + 10px);
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: min(340px, calc(100vw - 20px));
  pointer-events: none;
}
.guinea-run .gr-layer .gr-w1-talk:empty,
.guinea-run:not([data-state="playing"]) .gr-layer .gr-w1-talk {
  display: none;
}
.guinea-run .gr-w1-say--admin {
  border-color: #ea001e;
}
.guinea-run .gr-w1-avatar {
  flex-basis: 40px;
  width: 40px;
  height: 40px;
  background: #ffffff center / cover no-repeat;
  box-shadow: 0 0 0 2px #ffffff;
}
@media (max-width: 600px) {
  .guinea-run .gr-layer .gr-w1-talk {
    top: calc(var(--gr-top-end, 160px) + 48px);
    left: calc(env(safe-area-inset-left, 0px) + 10px);
    right: calc(env(safe-area-inset-right, 0px) + 10px);
    width: auto;
  }
}
`;
