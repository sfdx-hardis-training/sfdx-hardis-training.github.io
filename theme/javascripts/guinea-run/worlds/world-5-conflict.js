/*
 * World 5, Resolve the conflict: VS Code's merge editor, three rounds, while
 * the guinea pig sits at its desk in front of the monitor.
 *
 * Round 1 is the Sales_Manager permission set: US-014 granted
 * Account.Customer_Tier__c and Mariia's US-018 granted Account.Region__c at
 * the same place. Mechanical, take both, then read the Result, because git
 * merges lines, not permissions. Round 2 is the Account record page: each side
 * added one field at the same place, and keeping both is plainly right.
 * Round 3: three Pull Requests on a Friday afternoon, put in the order a
 * release manager picks. Then the boss (BOSS_FILES below): a dev in a hurry
 * grabs the mouse and clicks Accept Current Change on every conflict of one
 * more merge with Mariia, and his git push --force meets branch protection.
 *
 * Everything is HTML in ctx.hud.layer, one list of rows for the keyboard
 * (up and down pick a row, left and right a button, Enter presses it), and
 * the same buttons for a finger. A timer bar per round only gives a bonus.
 */
import { SLDS, glyph, fitText, rounded } from "../core/painter.js";
import { pickAdmins, adminFaceUrl as adminFaceUrlOf } from "../core/faces.js";
import { readingMs } from "../hud.js";

export const PADS = ["left", "right", "jump", "duck", "confirm"];

// The office furniture of the story, and the Salesforce things on the desks
export const MODELS = ["office", "salesforce"];

const PERMSET_FILE = "Sales_Manager.permissionset-meta.xml";
const PAGE_FILE = "Account_Record_Page.flexipage-meta.xml";
// Mariia's field comes in from the integration branch, yours is the current one
const FIELD_HERS = "    <field>Account.Region__c</field>";
const FIELD_YOURS = "    <field>Account.Customer_Tier__c</field>";
const HEAD = "<<<<<<< HEAD";
const SPLIT = "=======";
const THEIRS = ">>>>>>> origin/integration";
// What a round is worth, and the seconds that still give a time bonus
const ROUND_SECONDS = [65, 40, 50];
const TIME_BONUS = 150;
// Mistakes shown with their tip and a few points less, never an attempt
const FREE_MISTAKES = ["marker", "oneSide", "page", "failing", "smaller"];
const SLIP_POINTS = 30;
const DESK_SCALE = 1.45;
// Where the camera sits from what it looks at, on a wide and on a tall screen
const CAMERA_WIDE = { x: 4.5, y: 2.0, z: 3.8 };
const CAMERA_TALL = { x: 3.0, y: 2.3, z: 7.6 };

/*
 * The boss, after the release: a dev in a hurry grabs the mouse during one
 * more merge with Mariia and clicks Accept Current Change on every conflict.
 * Four files, each conflict two whole blocks (yours, then hers), so Accept
 * Both Changes is right every time. He hovers a link before he clicks it (the
 * wind-up, shorter in each file); his click wipes her side, and Undo brings it
 * back for BOSS_CATCH_S seconds. A line still gone after that costs a heart,
 * and Mariia puts it back. In the last two files he clicks two at a time. Then his
 * git push --force meets the branch protection of the integration branch.
 */
const BOSS_FILES = [
  {
    name: "Sales_Manager.permissionset-meta.xml",
    conflicts: [
      ["classAccesses", "AccountTierService", "KeyAccountsService"],
      ["fieldPermissions", "Account.Tier_Updated__c", "Opportunity.Delivery_Date__c"],
      ["fieldPermissions", "Account.Tier_Score__c", "Account.Key_Account__c"],
    ],
  },
  {
    name: "Sales_Rep.permissionset-meta.xml",
    conflicts: [
      ["classAccesses", "AccountTierService", "KeyAccountsService"],
      ["fieldPermissions", "Account.Tier_Score__c", "Account.Key_Account__c"],
      ["fieldPermissions", "Account.Tier_Updated__c", "Account.Key_Account_Manager__c"],
    ],
  },
  {
    name: PAGE_FILE,
    conflicts: [
      ["fieldInstance", "Record.Tier_Score__c", "Record.Key_Account__c"],
      ["fieldInstance", "Record.Tier_Updated__c", "Record.Key_Account_Manager__c"],
    ],
  },
  {
    name: "Account-Account Layout.layout-meta.xml",
    conflicts: [
      ["layoutItems", "Tier_Score__c", "Key_Account__c"],
      ["layoutItems", "Tier_Updated__c", "Key_Account_Manager__c"],
    ],
  },
];
// One bite per conflict kept whole and per click caught; the push takes what is left
const BOSS_HP = 12;
// Per file: how long he hovers a link before he clicks, and how long he waits between two
const BOSS_WINDUP = [2.2, 1.8, 1.5, 1.3];
const BOSS_PAUSE = [1.0, 0.8, 0.7, 0.6];
// The lo-fi theme speeds up file after file
const BOSS_PACE = [1.1, 1.2, 1.3, 1.4];
// The time to undo his click before Mariia's line is lost
const BOSS_CATCH_S = 3.6;
// A lost heart makes him slower, up to this much
const BOSS_EASE_MAX = 1.9;
// A player out of hearts at the admin starts the next try at him, within this long.
// Kept by the module, which outlives a world (the shell builds a fresh one for each try)
const BOSS_RETRY_MS = 15 * 60000;
let bossRetryAt = 0;
// What his git push --force gets back from the integration branch
const PUSH_COMMAND = "$ git push --force origin integration";
const PUSH_REPLY = [
  "remote: error: GH006: Protected branch update failed for refs/heads/integration.",
  "remote: error: Cannot force-push to this branch",
  " ! [remote rejected] integration -> integration (protected branch hook declined)",
  "error: failed to push some refs to 'origin'",
];

export const TEXTS = {
  en: {
    intro:
      "Mariia merged first, on the files you touched. Merge your work with hers, then put three Pull Requests in order as release manager.",
    how1: "Take both sides: tap Accept Current, then Accept Incoming",
    how2: "On the record page, keep both fields: Accept Incoming and Accept Current",
    how3: "Arrows move, Enter presses, drag the cards to order them",
    g_r1_take: "Accept Incoming and Accept Current",
    g_r1_split: "Add the four lines: two blocks",
    g_r1_sort: "Sort the blocks, then merge",
    g_complete: "Click Complete Merge",
    g_r3: "Order the 3 Pull Requests, then merge",
    g_r3_merge: "Watch the merges go in",
    co_r1: "Round 1: take both sides!",
    co_r2: "Round 2: two fields, one page. Keep both!",
    co_r3: "Round 3: you are the release manager!",
    co_read: "Now read the Result!",
    fix_marker: "Accept a side first",
    fix_oneSide: "Take both sides!",
    fix_dup: "Add the four lines: two blocks",
    fix_failing: "Send US-062 back to Mariia",
    fix_smaller: "The smaller one goes first",
    screenConflict: "Conflict",
    screenMerged: "Merged",
    screenDup: "Duplicated",
    screenReleased: "Released",
    note: "Before Complete Merge, read the Result as if somebody else wrote it. Git merges lines, not permissions. - V.",
    noteLine: "<!-- V. left something here -->",
    round: "Round {{n}} / 3",
    r1_task:
      "Mariia merged this morning. You did not. Build the Result from both sides, read it, then Complete Merge.",
    r2_task: "You added Customer_Tier__c to the Account record page. Mariia added Region__c at the same place. The page has room for both.",
    r3_task:
      "Friday afternoon. Three stories were planned for this week's release. Put them in the order you would merge them.",
    accepted: "Accepted",
    split: "Add the four lines: two blocks",
    sort: "Sort: Customer_Tier__c first",
    slot1: "Merge first",
    slot2: "Merge second",
    slot3: "Send back to its author",
    checksGreen: "checks green",
    checksFailing: "checks failing",
    sizeSmall: "small: one <fieldPermissions> block",
    sizeBig: "bigger: a field, a layout, a grant",
    sizeFail: "KeyAccountsServiceTest does not compile",
    mergeOrder: "Merge in this order",
    moveUp: "Move up",
    moveDown: "Move down",
    merged: "Merged",
    backToAuthor: "Back to Mariia",
    keys: "Up/Down: move · Left/Right: choose · Enter: apply",
    keysR3: "Enter: pick up a card, Up/Down: move it, Enter: drop it",
    touch: "Tap a button",
    touchR3: "Drag a card, or use its arrows",
    stampMerge: "Merge complete",
    stampRelease: "Released: US-056, then US-052",
    timeBonus: "Time bonus +{{n}}",
    c_r1: "Morning! US-018 is in the integration branch. I granted Region__c on Sales_Manager, one line from yours, I think.",
    c_mariia2: "Sorry, I put Region__c on the Account record page too, right where you put yours.",
    c_romain3:
      "Green, small, nothing in its way. Thanks for taking mine first.",
    c_mariia3:
      "Fair. I will fix KeyAccountsServiceTest, it lands on Monday.",
    ok_both: "Both grants kept",
    ok_r1: "Two complete blocks, in alphabetical order",
    ok_r1_unsorted: "Two blocks, but not in alphabetical order",
    ok_r3: "US-056, then US-052, and US-062 back to Mariia",
    e_marker: "The check fails on a conflict marker.",
    e_marker_tip:
      "Search the whole repository for <<<<<<<, ======= and >>>>>>>. A marker in an XML file is sometimes syntactically tolerated by git and always fatal to Salesforce.",
    e_lostYours: "Your Customer_Tier__c grant quietly disappeared",
    e_lostHers: "Mariia's Region__c grant quietly disappeared",
    e_oneSide_tip:
      "Take both is the right answer for almost every permission set conflict. Choosing one side is how a teammate's permission quietly disappears, and nobody notices until somebody cannot see a field.",
    e_dup:
      "Element field is duplicated at this location in type PermissionSetFieldPermissions",
    e_dup_tip:
      "One <fieldPermissions> block names one field: the fix is two blocks, not one block with two <field> lines.",
    e_failing: "US-062 is failing, and it is in the release",
    e_failing_tip:
      "A failing Pull Request is not a decision, it is a task for its author. Send it back with one comment, and leave it open.",
    e_smaller: "The bigger one went first",
    e_smaller_tip:
      "All else equal, merge the smaller one first: its author has less to redo if the other one lands badly.",
    info_unsorted:
      "Your two blocks were not in alphabetical order: Salesforce writes Customer_Tier__c first, then Region__c.",
    tickMerged: "Merged #{{n}} {{title}} into the integration branch",
    tickDeployed: "Deployed to the integration org: both grants are there",
    tickBack:
      "Comment on #3: KeyAccountsServiceTest does not compile, addManagers returns a Set, not a List",
    screenBad: "Not deployable",
    fix_page: "Take both fields!",
    ok_page: "Both fields on the record page",
    e_pageLostYours: "Customer Tier is gone from the record page",
    e_pageLostHers: "Mariia's Region field is gone from the record page",
    e_page_tip: "Each side added one complete field block. Accept Incoming alone drops your field, Accept Current alone drops Mariia's: click both, and the page shows the two fields.",
    prList: "Pull Requests · integration branch",
    bossName: "Dev in a hurry",
    bossFile: "File {{n}} / {{total}}",
    r4_task:
      "Monday: Mariia's US-062 is in the integration branch, and a dev grabbed your mouse. Each conflict is two people's work: keep both.",
    co_boss: "A dev in a hurry grabs the mouse!",
    co_double: "Two at once: watch both!",
    co_protected: "Branch protection said no!",
    g_boss: "Accept Both Changes before he clicks",
    g_boss_undo: "Undo his click, fast!",
    g_boss_push: "Watch the integration branch",
    touchBoss: "Tap Accept Both Changes, and Undo when he clicks",
    b_arrive: "Still merging? Move over. Accept Current Change everywhere: mine is always right!",
    b_missed: "Huh? Already merged?",
    b_caught: "Hey, I clicked that!",
    b_next: "Lucky. Next file!",
    b_angry: "Too slow! Two at a time!",
    b_last: "One file left. I'll be quicker!",
    b_push: "Whatever. I push my version straight to the integration branch.",
    b_giveUp: "Rejected?! Fine... a Pull Request, then.",
    b_kept: "Both kept",
    b_first: "Faster than him",
    b_caughtToast: "Caught! The line is back",
    b_beaten: "The dev gives the mouse back!",
    b_held: "Branch protection held",
    b_wipedHers: "Mariia's line removed",
    b_wipedYours: "Your line removed",
    b_undo: "Undo",
    b_you: "You",
    b_self: "You removed Mariia's line: undo it",
    b_selfYours: "You removed your own line: undo it",
    fix_wipe: "Undo, then Accept Both Changes",
    b_lostHers: "Mariia's {{name}} is gone",
    b_lostYours: "Your {{name}} is gone",
    b_lost_tip:
      "Accept Current Change keeps your side and drops the other one without a word. Each conflict here is two people's work: Accept Both Changes keeps both.",
    b_lostYours_tip:
      "Accept Incoming Change keeps Mariia's side and drops yours. Each conflict here is two people's work: Accept Both Changes keeps both.",
    c_mariia_boss: "US-062 is fixed and merged. Your branch meets it in four files, sorry!",
    c_mariia_back: "Hey, my {{name}} is gone! I put it back: keep both, please.",
    c_mariia_end: "Every line of mine is there. Thanks for reading both sides!",
    stampProtected: "Branch protection: push rejected",
    screenProtected: "Protected",
    retryHint: "Try again starts at the dev.",
    retryBoss: "Straight back to the dev: the three rounds are done",
    info_lost:
      "Accept Current Change is the fast button, and it throws the other side away without a word: read both sides before you click.",
  },
  fr: {
    intro:
      "Mariia a mergé avant vous, sur les fichiers que vous avez touchés. Fusionnez votre travail avec le sien, puis mettez trois Pull Requests dans l'ordre en release manager.",
    how1: "Prenez les deux : Accept Current, puis Accept Incoming",
    how2: "Sur la page d'enregistrement, gardez les deux champs : Accept Incoming et Accept Current",
    how3: "Flèches pour bouger, Entrée pour valider, glissez les cartes",
    g_r1_take: "Accept Incoming et Accept Current",
    g_r1_split: "Ajoutez les quatre lignes : deux blocs",
    g_r1_sort: "Triez les blocs, puis mergez",
    g_complete: "Cliquez sur Complete Merge",
    g_r3: "Ordonnez les 3 Pull Requests, puis mergez",
    g_r3_merge: "Regardez les merges passer",
    co_r1: "Manche 1 : prenez les deux côtés !",
    co_r2: "Manche 2 : deux champs, une page. Gardez les deux !",
    co_r3: "Manche 3 : vous êtes release manager !",
    co_read: "Lisez maintenant le Result !",
    fix_marker: "Acceptez d'abord un côté",
    fix_oneSide: "Prenez les deux côtés !",
    fix_dup: "Ajoutez les quatre lignes : deux blocs",
    fix_failing: "Renvoyez US-062 à Mariia",
    fix_smaller: "La plus petite passe d'abord",
    screenConflict: "Conflit",
    screenMerged: "Mergé",
    screenDup: "En double",
    screenReleased: "En release",
    note: "Avant Complete Merge, lisez le Result comme si quelqu'un d'autre l'avait écrit. Git merge des lignes, pas des permissions. - V.",
    noteLine: "<!-- V. a laissé quelque chose ici -->",
    round: "Manche {{n}} / 3",
    r1_task:
      "Mariia a mergé ce matin. Pas vous. Construisez le Result avec les deux côtés, lisez-le, puis Complete Merge.",
    r2_task: "Vous avez ajouté Customer_Tier__c à la page d'enregistrement Compte. Mariia a ajouté Region__c au même endroit. La page a de la place pour les deux.",
    r3_task:
      "Vendredi après-midi. Trois stories étaient prévues pour la release de la semaine. Mettez-les dans l'ordre où vous les mergeriez.",
    accepted: "Accepté",
    split: "Ajouter les quatre lignes : deux blocs",
    sort: "Trier : Customer_Tier__c en premier",
    slot1: "Merger en premier",
    slot2: "Merger en second",
    slot3: "Renvoyer à son auteur",
    checksGreen: "contrôles verts",
    checksFailing: "contrôles en échec",
    sizeSmall: "petite : un bloc <fieldPermissions>",
    sizeBig: "plus grosse : un champ, un layout, un accès",
    sizeFail: "KeyAccountsServiceTest ne compile pas",
    mergeOrder: "Merger dans cet ordre",
    moveUp: "Monter",
    moveDown: "Descendre",
    merged: "Mergée",
    backToAuthor: "Repart chez Mariia",
    keys: "Haut/Bas : se déplacer · Gauche/Droite : choisir · Entrée : appliquer",
    keysR3:
      "Entrée : prendre une carte, Haut/Bas : la déplacer, Entrée : la poser",
    touch: "Touchez un bouton",
    touchR3: "Faites glisser une carte, ou utilisez ses flèches",
    stampMerge: "Merge terminé",
    stampRelease: "En release : US-056, puis US-052",
    timeBonus: "Bonus de temps +{{n}}",
    c_r1: "Salut ! US-018 est dans la branch integration. J'ai donné Region__c sur Sales_Manager, à une ligne du tien, je crois.",
    c_mariia2: "Désolée, j'ai aussi mis Region__c sur la page d'enregistrement Compte, juste là où tu as mis le tien.",
    c_romain3:
      "Verte, petite, rien sur son chemin. Merci d'avoir pris la mienne en premier.",
    c_mariia3:
      "D'accord. Je répare KeyAccountsServiceTest, elle passera lundi.",
    ok_both: "Les deux accès gardés",
    ok_r1: "Deux blocs complets, par ordre alphabétique",
    ok_r1_unsorted: "Deux blocs, mais pas par ordre alphabétique",
    ok_r3: "US-056, puis US-052, et US-062 repart chez Mariia",
    e_marker: "Le contrôle échoue sur un marqueur de conflit.",
    e_marker_tip:
      "Cherchez <<<<<<<, ======= et >>>>>>> dans tout le repository. Un marqueur dans un fichier XML est parfois toléré syntaxiquement par git et toujours fatal pour Salesforce.",
    e_lostYours: "Votre accès Customer_Tier__c a disparu en silence",
    e_lostHers: "L'accès Region__c de Mariia a disparu en silence",
    e_oneSide_tip:
      "Prendre les deux est la bonne réponse pour presque tous les conflits de permission set. Choisir un côté est la façon dont la permission d'un collègue disparaît en silence, sans que personne s'en aperçoive avant que quelqu'un ne voie plus un champ.",
    e_dup:
      "Element field is duplicated at this location in type PermissionSetFieldPermissions",
    e_dup_tip:
      "Un bloc <fieldPermissions> nomme un champ : la correction est deux blocs, pas un bloc avec deux lignes <field>.",
    e_failing: "US-062 est en échec, et elle est dans la release",
    e_failing_tip:
      "Une Pull Request en échec n'est pas une décision, c'est une tâche pour son auteur. Renvoyez-la avec un commentaire, et laissez-la ouverte.",
    e_smaller: "La plus grosse est passée en premier",
    e_smaller_tip:
      "Toutes choses égales par ailleurs, mergez la plus petite d'abord : son auteur a moins à refaire si l'autre atterrit mal.",
    info_unsorted:
      "Vos deux blocs n'étaient pas par ordre alphabétique : Salesforce écrit Customer_Tier__c en premier, puis Region__c.",
    tickMerged: "#{{n}} {{title}} mergée dans la branch integration",
    tickDeployed: "Déployé sur l'org d'integration : les deux accès sont là",
    tickBack:
      "Commentaire sur #3 : KeyAccountsServiceTest ne compile pas, addManagers renvoie un Set, pas une List",
    screenBad: "Pas déployable",
    fix_page: "Prenez les deux champs !",
    ok_page: "Les deux champs sur la page d'enregistrement",
    e_pageLostYours: "Customer Tier a disparu de la page d'enregistrement",
    e_pageLostHers: "Le champ Region de Mariia a disparu de la page d'enregistrement",
    e_page_tip: "Chaque côté a ajouté un bloc de champ complet. Accept Incoming seul retire votre champ, Accept Current seul retire celui de Mariia : cliquez sur les deux, et la page montre les deux champs.",
    prList: "Pull Requests · branch integration",
    bossName: "Dev pressé",
    bossFile: "Fichier {{n}} / {{total}}",
    r4_task:
      "Lundi : US-062 de Mariia est dans la branch integration, et un dev a pris votre souris. Chaque conflit est le travail de deux personnes : gardez les deux.",
    co_boss: "Un dev pressé prend la souris !",
    co_double: "Deux d'un coup : surveillez les deux !",
    co_protected: "La protection de branch a dit non !",
    g_boss: "Accept Both Changes avant son clic",
    g_boss_undo: "Annulez son clic, vite !",
    g_boss_push: "Regardez la branch integration",
    touchBoss: "Touchez Accept Both Changes, et Annuler quand il clique",
    b_arrive: "Encore en train de merger ? Poussez-vous. Accept Current Change partout : ma version a toujours raison !",
    b_missed: "Hein ? Déjà mergé ?",
    b_caught: "Hé, j'avais cliqué !",
    b_next: "Coup de chance. Fichier suivant !",
    b_angry: "Trop lent ! Deux à la fois !",
    b_last: "Plus qu'un fichier. Je serai plus rapide !",
    b_push: "Peu importe. Je pousse ma version directement sur la branch integration.",
    b_giveUp: "Refusé ?! Bon... une Pull Request, alors.",
    b_kept: "Les deux gardés",
    b_first: "Plus rapide que lui",
    b_caughtToast: "Rattrapé ! La ligne revient",
    b_beaten: "Le dev rend la souris !",
    b_held: "La protection de branch a tenu",
    b_wipedHers: "Ligne de Mariia supprimée",
    b_wipedYours: "Votre ligne supprimée",
    b_undo: "Annuler",
    b_you: "Vous",
    b_self: "Vous avez supprimé la ligne de Mariia : annulez",
    b_selfYours: "Vous avez supprimé votre propre ligne : annulez",
    fix_wipe: "Annuler, puis Accept Both Changes",
    b_lostHers: "{{name}} de Mariia a disparu",
    b_lostYours: "Votre {{name}} a disparu",
    b_lost_tip:
      "Accept Current Change garde votre côté et jette l'autre sans un mot. Chaque conflit ici est le travail de deux personnes : Accept Both Changes garde les deux.",
    b_lostYours_tip:
      "Accept Incoming Change garde le côté de Mariia et jette le vôtre. Chaque conflit ici est le travail de deux personnes : Accept Both Changes garde les deux.",
    c_mariia_boss: "US-062 est corrigée et mergée. Ta branch la croise dans quatre fichiers, désolée !",
    c_mariia_back: "Hé, mon {{name}} a disparu ! Je le remets : garde les deux, s'il te plaît.",
    c_mariia_end: "Toutes mes lignes sont là. Merci d'avoir lu les deux côtés !",
    stampProtected: "Protection de branch : push refusé",
    screenProtected: "Protégée",
    retryHint: "Réessayer reprend au dev.",
    retryBoss: "Retour direct au dev : les trois manches sont faites",
    info_lost:
      "Accept Current Change est le bouton rapide, et il jette l'autre côté sans un mot : lisez les deux côtés avant de cliquer.",
  },
};

/** The strings taken word for word from the labs, checked by scripts/verify/check-easter-egg.mjs. */
export const QUOTES = [
  { lab: "2.7", text: "Accept Incoming" },
  { lab: "2.7", text: "Accept Current" },
  { lab: "2.7", text: "Complete Merge" },
  { lab: "2.7", text: "<<<<<<< HEAD" },
  { lab: "2.7", text: ">>>>>>> origin/integration" },
  { lab: "2.7", text: "<fieldPermissions>" },
  { lab: "2.7", text: "</fieldPermissions>" },
  { lab: "2.7", text: "<editable>true</editable>" },
  { lab: "2.7", text: "<readable>true</readable>" },
  {
    lab: "2.7",
    text: "Element field is duplicated at this location in type PermissionSetFieldPermissions",
  },
  { lab: "3.4", text: "Mariia Pyvovarchuk" },
  { lab: "3.4", text: "Romain Panda" },
  // The links VS Code draws over a file with conflict markers, clicked by the admin and by you
  { lab: "3.10", text: "Accept Current Change" },
  { lab: "3.10", text: "Accept Incoming Change" },
  { lab: "3.10", text: "Accept Both Changes" },
];

// The three Pull Requests of the Friday release: the two green ones share Sales_Manager
const PRS = {
  "052": {
    n: 1,
    title: "US-052 Delivery date on opportunities",
    author: "Mariia Pyvovarchuk",
    ok: true,
    touches: "Opportunity Layout, Sales_Manager",
    size: "sizeBig",
  },
  "056": {
    n: 2,
    title: "US-056 Case escalation email",
    author: "Romain Panda",
    ok: true,
    touches: "Sales_Manager",
    size: "sizeSmall",
  },
  "062": {
    n: 3,
    title: "US-062 Key accounts group",
    author: "Mariia Pyvovarchuk",
    ok: false,
    touches: "KeyAccountsService",
    size: "sizeFail",
  },
};

// The record page: each side added one field block at the same place
const PAGE_FIELDS = {
  in: [
    "<itemInstances>",
    "    <fieldInstance>",
    "        <fieldItem>Record.Region__c</fieldItem>",
    "    </fieldInstance>",
    "</itemInstances>",
  ],
  cur: [
    "<itemInstances>",
    "    <fieldInstance>",
    "        <fieldItem>Record.Customer_Tier__c</fieldItem>",
    "    </fieldInstance>",
    "</itemInstances>",
  ],
};

export function createWorld(ctx) {
  const { THREE, t, hud, pig, paint } = ctx;
  const camera = ctx.camera;
  const disposables = [];

  /* ---------- The office, in 3D ---------- */

  const box = paint.geometry("w5-box", () => new THREE.BoxGeometry(1, 1, 1));
  const plane = paint.geometry("w5-plane", () => new THREE.PlaneGeometry(1, 1));
  const cylinder = paint.geometry(
    "w5-cyl",
    () => new THREE.CylinderGeometry(0.5, 0.5, 1, 20),
  );
  const wood = paint.plain(0xf5d7a1);
  const dark = paint.plain(0x2b2b2b, { roughness: 0.4 });
  const steel = paint.plain(0x0176d3, { roughness: 0.5 });

  function block(material, w, h, d, x, y, z, parent) {
    const mesh = new THREE.Mesh(box, material);
    mesh.scale.set(w, h, d);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    (parent || ctx.root).add(mesh);
    return mesh;
  }

  /**
   * A model of the office pack at a place, or null when the pack did not load
   * (the world then draws its own shapes). Small things cast no shadow.
   */
  function model(name, options, x, y, z, turn, parent) {
    const copy = ctx.models ? ctx.models.get(name, options) : null;
    if (!copy) {
      return null;
    }
    copy.position.set(x, y, z);
    copy.rotation.y = turn || 0;
    (parent || ctx.root).add(copy);
    return copy;
  }

  const floor = new THREE.Mesh(
    plane,
    paint.plain(0xfdf6e9, { roughness: 0.9 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.scale.set(14, 10, 1);
  floor.position.set(1, 0, -1);
  floor.receiveShadow = true;
  ctx.root.add(floor);
  const wall = new THREE.Mesh(
    plane,
    paint.plain(0xdff1ff, { roughness: 0.95 }),
  );
  wall.scale.set(14, 4, 1);
  wall.position.set(1, 2, -2.2);
  wall.receiveShadow = true;
  ctx.root.add(wall);
  // Colour on the wall: a Lightning banner of stripes, and rugs on the floor
  const stripeColors = [0x0176d3, 0x06a59a, 0xffb400, 0xe3066a, 0x9050e9];
  stripeColors.forEach((color, i) => {
    const stripe = new THREE.Mesh(
      plane,
      paint.plain(color, { roughness: 0.7 }),
    );
    stripe.scale.set(1.3, 0.22, 1);
    stripe.position.set(-4.4 + i * 1.35, 3.05, -2.19);
    stripe.rotation.z = i % 2 ? 0.04 : -0.04;
    ctx.root.add(stripe);
  });
  if (!model("rugRound", { width: 3.2, shadows: false }, 0.1, 0.005, -0.6)) {
    const rug = new THREE.Mesh(
      cylinder,
      paint.plain(0x7fd6cf, { roughness: 0.95 }),
    );
    rug.scale.set(3, 0.02, 2.4);
    rug.position.set(0.1, 0.01, -0.6);
    rug.receiveShadow = true;
    ctx.root.add(rug);
  }
  if (
    !model("rugRounded", { width: 3, shadows: false }, -3.1, 0.006, -0.8, 0.35)
  ) {
    const herRug = new THREE.Mesh(
      cylinder,
      paint.plain(0xffc7e2, { roughness: 0.95 }),
    );
    herRug.scale.set(2.6, 0.02, 2.2);
    herRug.position.set(-3.1, 0.011, -0.8);
    herRug.receiveShadow = true;
    ctx.root.add(herRug);
  }
  // Two plants: a pot and three round leaves each
  const sphere = paint.geometry(
    "w5-sphere",
    () => new THREE.SphereGeometry(0.5, 16, 12),
  );
  const leaf = paint.plain(0x3ba755, { roughness: 0.7 });
  const pot = paint.plain(0xff5d2d, { roughness: 0.6 });
  for (const [px, pz] of [
    [1.9, -1.8],
    [-5.2, -1.6],
  ]) {
    if (model("pottedPlant", { height: 1.4 }, px, 0, pz)) {
      continue;
    }
    const plant = new THREE.Group();
    plant.position.set(px, 0, pz);
    ctx.root.add(plant);
    const base = new THREE.Mesh(cylinder, pot);
    base.scale.set(0.5, 0.5, 0.5);
    base.position.y = 0.25;
    plant.add(base);
    for (const [lx, ly, lz, r] of [
      [0, 0.85, 0, 0.6],
      [0.22, 1.2, 0.05, 0.42],
      [-0.2, 1.1, -0.05, 0.4],
    ]) {
      const ball = new THREE.Mesh(sphere, leaf);
      ball.scale.setScalar(r);
      ball.position.set(lx, ly, lz);
      plant.add(ball);
    }
  }
  model("sideTable", { height: 0.7 }, 2.3, 0, -1.6);
  model(
    "kitchenCoffeeMachine",
    { height: 0.55, shadows: false },
    2.3,
    0.7,
    -1.6,
    -0.4,
  );
  model("loungeSofa", { width: 2.6 }, -6.4, 0, -1.4, 0.5);
  if (!model("cloudity-logo", { height: 0.95 }, -1.8, 2.15, -2.1, Math.PI)) {
    const plaque = new THREE.Mesh(plane, paint.plaque());
    plaque.scale.set(1.1, 0.53, 1);
    plaque.position.set(1.8, 1.75, -2.18);
    ctx.root.add(plaque);
  }

  /** A desk with its monitor, facing +Z. Returns the screen mesh. */
  function desk(x, z, screenMaterial) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    // Built at a person's size, then grown: the guinea pig is the hero, not to scale
    group.scale.setScalar(DESK_SCALE);
    ctx.root.add(group);
    const top = model("desk", { width: 1.8 }, 0, 0, 0, 0, group);
    if (top) {
      const height = new THREE.Box3().setFromObject(top).max.y;
      const monitor = ctx.models.get("computerScreen", { width: 1.2 });
      if (monitor) {
        monitor.position.set(0, height, -0.15);
        // The picture sits in front of the model's own screen, on its upper part
        const frame = new THREE.Box3().setFromObject(monitor);
        const size = frame.getSize(new THREE.Vector3());
        group.add(monitor);
        const screen = new THREE.Mesh(plane, screenMaterial);
        screen.scale.set(size.x * 0.88, size.y * 0.62, 1);
        screen.position.set(0, frame.min.y + size.y * 0.6, frame.max.z + 0.01);
        group.add(screen);
        model(
          "computerKeyboard",
          { width: 0.62, shadows: false },
          0,
          height,
          0.2,
          0,
          group,
        );
        return { group, screen, top: height };
      }
    }
    block(wood, 1.7, 0.06, 0.7, 0, 0.5, 0, group);
    for (const [lx, lz] of [
      [-0.78, -0.28],
      [0.78, -0.28],
      [-0.78, 0.28],
      [0.78, 0.28],
    ]) {
      block(steel, 0.05, 0.5, 0.05, lx, 0.25, lz, group);
    }
    block(dark, 0.08, 0.3, 0.08, 0, 0.66, -0.18, group);
    block(dark, 0.36, 0.03, 0.2, 0, 0.545, -0.18, group);
    block(dark, 1.12, 0.7, 0.05, 0, 1.08, -0.2, group);
    const screen = new THREE.Mesh(plane, screenMaterial);
    screen.scale.set(1.04, 0.62, 1);
    screen.position.set(0, 1.08, -0.172);
    group.add(screen);
    block(paint.plain(0xdddddd), 0.6, 0.025, 0.18, 0, 0.545, 0.17, group);
    return { group, screen, top: 0.53 };
  }

  // The guinea pig's monitor shows where the merge stands
  const screens = {};
  function screenMaterial(kind) {
    if (!screens[kind]) {
      const texture = paint.texture(
        "w5-screen-" + kind + ctx.lang,
        512,
        304,
        (c, w, h) => drawScreen(c, w, h, kind, t),
      );
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        toneMapped: false,
      });
      disposables.push(material);
      screens[kind] = material;
    }
    return screens[kind];
  }
  const mine = desk(0, -1.5, screenMaterial("permset"));
  const mug = new THREE.Mesh(cylinder, paint.plain(0x0176d3));
  mug.scale.set(0.1, 0.13, 0.1);
  mug.position.set(0.62, mine.top + 0.07, 0.1);
  mine.group.add(mug);

  // Mariia's desk, to the right: her US-018 on screen, her chair, her name
  const herCard = new THREE.MeshBasicMaterial({
    map: paint.texture("w5-her-screen", 512, 304, (c, w, h) =>
      drawBig(c, w, h, SLDS.purple, "branch", "US-018"),
    ),
    toneMapped: false,
  });
  disposables.push(herCard);
  const hers = desk(-3.4, -1.5, herCard);
  hers.group.rotation.y = 0.35;
  const chair = new THREE.Group();
  chair.position.set(-3.1, 0, -0.45);
  chair.rotation.y = 0.35;
  chair.scale.setScalar(DESK_SCALE);
  ctx.root.add(chair);
  if (!model("chairDesk", { height: 1.0 }, 0, 0, 0, Math.PI, chair)) {
    const purple = paint.plain(0x9050e9);
    block(purple, 0.5, 0.07, 0.5, 0, 0.42, 0, chair);
    block(purple, 0.5, 0.55, 0.07, 0, 0.72, 0.24, chair);
    block(steel, 0.06, 0.4, 0.06, 0, 0.2, 0, chair);
  }
  // Mariia herself, on her chair: she turns to the guinea pig when she talks
  const mariia = new THREE.Group();
  mariia.position.set(0, 0.46, 0.02);
  chair.add(mariia);
  const capsule = paint.geometry(
    "w5-capsule",
    () => new THREE.CapsuleGeometry(0.15, 0.26, 6, 12),
  );
  const torso = new THREE.Mesh(
    capsule,
    paint.plain(0xe3066a, { roughness: 0.6 }),
  );
  torso.position.y = 0.3;
  mariia.add(torso);
  const head = new THREE.Group();
  head.position.y = 0.66;
  mariia.add(head);
  const face = new THREE.Mesh(
    sphere,
    paint.plain(0xf1c8a8, { roughness: 0.7 }),
  );
  face.scale.setScalar(0.25);
  head.add(face);
  const hairMaterial = paint.plain(0x4a2a1a, { roughness: 0.8 });
  const hair = new THREE.Mesh(sphere, hairMaterial);
  hair.scale.set(0.27, 0.22, 0.27);
  hair.position.set(0, 0.04, 0.03);
  head.add(hair);
  const bun = new THREE.Mesh(sphere, hairMaterial);
  bun.scale.setScalar(0.12);
  bun.position.set(0, 0.1, 0.13);
  head.add(bun);
  const herSign = paint.sign("w5-mariia", "Mariia", {
    color: SLDS.purple,
    height: 0.42,
  });
  herSign.position.set(-3.1, 2.6, -0.5);
  ctx.root.add(herSign);
  let talking = 0;
  let herTurn = 0;
  let clockHead = 0;

  /* ---------- The admin of the boss: a body, and one of the twenty-one faces ---------- */

  // A face picked once per play: guinea-seed replays the same one
  // One of the twenty-one admins, not the one of the last play
  const adminFace = pickAdmins(5, ctx.random)[0];
  const adminFaceUrl = adminFaceUrlOf(adminFace);
  // Where he stands, by the guinea pig's desk, and where he walks in from
  const ADMIN_AT = { x: 1.45, z: -0.25 };
  const ADMIN_FROM = 5.4;
  const admin = buildAdmin();

  function buildAdmin() {
    const group = new THREE.Group();
    group.position.set(ADMIN_FROM, 0, ADMIN_AT.z);
    group.visible = false;
    ctx.root.add(group);
    const shirt = paint.plain(0x3a49da, { roughness: 0.6 });
    const skin = paint.plain(0xf0c09a, { roughness: 0.7 });
    const legGeometry = paint.geometry("w5-admin-leg", () => new THREE.CapsuleGeometry(0.11, 0.5, 4, 10));
    const legs = [];
    for (const x of [-0.13, 0.13]) {
      const leg = new THREE.Mesh(legGeometry, paint.plain(0x2b2b38, { roughness: 0.7 }));
      leg.position.set(x, 0.36, 0);
      leg.castShadow = true;
      group.add(leg);
      legs.push(leg);
    }
    const torso = new THREE.Group();
    torso.position.y = 0.72;
    group.add(torso);
    const body = new THREE.Mesh(paint.geometry("w5-admin-body", () => new THREE.CapsuleGeometry(0.28, 0.4, 6, 14)), shirt);
    body.position.y = 0.36;
    body.castShadow = true;
    torso.add(body);
    // His badge on a lanyard: he has every permission
    const badge = new THREE.Mesh(box, paint.plain(0xffffff, { roughness: 0.4 }));
    badge.scale.set(0.16, 0.2, 0.03);
    badge.position.set(0, 0.36, 0.29);
    torso.add(badge);
    const strap = new THREE.Mesh(box, paint.plain(0xea001e));
    strap.scale.set(0.05, 0.18, 0.02);
    strap.position.set(0, 0.52, 0.27);
    torso.add(strap);
    // The clicking arm hangs from the shoulder on the desk side
    const armGeometry = paint.geometry("w5-admin-arm", () => new THREE.CapsuleGeometry(0.075, 0.4, 4, 8));
    const arms = [];
    for (const side of [-1, 1]) {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.34, 0.66, 0);
      torso.add(shoulder);
      const arm = new THREE.Mesh(armGeometry, shirt);
      arm.position.y = -0.26;
      arm.castShadow = true;
      shoulder.add(arm);
      const hand = new THREE.Mesh(sphere, skin);
      hand.scale.setScalar(0.15);
      hand.position.y = -0.52;
      shoulder.add(hand);
      arms.push(shoulder);
    }
    // The face: a disc that always looks at the camera, drawn plain until the portrait loads
    const faceCanvas = document.createElement("canvas");
    faceCanvas.width = 256;
    faceCanvas.height = 256;
    const faceContext = faceCanvas.getContext("2d");
    drawStandInFace(faceContext, 256, adminFace);
    const texture = new THREE.CanvasTexture(faceCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    disposables.push(texture);
    const portrait = new Image();
    portrait.decoding = "async";
    portrait.onload = () => {
      if (!admin.gone) {
        drawPortrait(faceContext, portrait, 256);
        texture.needsUpdate = true;
      }
    };
    // A face that does not load keeps its plain drawing, and the world never waits for it
    portrait.onerror = () => {};
    portrait.src = adminFaceUrl;
    const faceMaterial = new THREE.MeshBasicMaterial({ map: texture, alphaTest: 0.5, toneMapped: false });
    disposables.push(faceMaterial);
    const face = new THREE.Mesh(paint.geometry("w5-admin-face", () => new THREE.CircleGeometry(0.36, 40)), faceMaterial);
    face.visible = false;
    face.renderOrder = 1;
    ctx.root.add(face);
    const sign = paint.sign("w5-admin-sign", "Dev", { color: SLDS.error, glyph: "profile", height: 0.24 });
    sign.visible = false;
    ctx.root.add(sign);
    return { group, torso, legs, arms, face, sign, gone: false };
  }

  /* ---------- The Salesforce things on the desks ---------- */

  // The items of the salesforce pack face -Z: turned to the camera, at +X +Z
  const TO_CAMERA = Math.atan2(CAMERA_WIDE.x, CAMERA_WIDE.z);
  const deskTop = mine.top * DESK_SCALE;

  function item(name, height, x, y, z, turn) {
    const node = model(
      name,
      { height, shadows: false },
      x,
      y,
      z,
      turn === undefined ? TO_CAMERA : turn,
    );
    if (node) {
      node.userData.base = node.scale.x;
    }
    return node;
  }

  // What each conflict is about, on both desks: the permission set, then the record page
  const roundItems = {
    1: [
      item("permission-set", 0.7, 0.95, deskTop, -1.15),
      item("permission-set", 0.7, -2.75, deskTop, -1.1),
    ],
    2: [
      item("record", 0.7, 0.95, deskTop, -1.15),
      item("record", 0.7, -2.75, deskTop, -1.1),
    ],
  };
  // Round 3: the three Pull Requests over the desk, in the order the player sets
  const prItems = {};
  for (const id of Object.keys(PRS)) {
    const node = item("pull-request", 0.42, 0, deskTop + 0.3, -1.15);
    if (node) {
      const sign = paint.sign("w5-pr-" + id, "US-" + id, {
        color: PRS[id].ok ? SLDS.success : SLDS.error,
        height: 0.24,
      });
      ctx.root.add(sign);
      prItems[id] = { node, sign, x: 0, z: -1.15 };
    }
  }
  // Victor's sticky note on the desk, until it is found in the editor
  const noteItem = item("note", 0.32, -0.95, deskTop, -1.2);
  let notePop = -1;
  // A big tick or cross over the monitor when a merge goes right or wrong
  const marks = {
    pass: item("check-pass", 0.6, 1.0, 2.0, -1.2),
    fail: item("check-fail", 0.6, 1.0, 2.0, -1.2),
  };
  let markNode = null;
  let markTime = 0;

  for (const node of [marks.pass, marks.fail]) {
    if (node) {
      node.visible = false;
    }
  }
  let itemClock = 0;

  function showMark(kind) {
    if (markNode) {
      markNode.visible = false;
    }
    markNode = marks[kind];
    markTime = 1.4;
  }

  function animateItems(dt) {
    itemClock += dt;
    for (const [n, list] of Object.entries(roundItems)) {
      for (const node of list) {
        if (node) {
          node.visible = Number(n) === round;
        }
      }
    }
    r3.order.forEach((id, i) => {
      const pr = prItems[id];
      if (!pr) {
        return;
      }
      const shown = round === 3;
      pr.node.visible = shown;
      pr.sign.visible = shown;
      const back = r3.back && id === "062";
      const ease = Math.min(1, dt * 5);
      pr.x += ((back ? -2.3 : -0.8 + i * 0.8) - pr.x) * ease;
      pr.z += ((back ? -0.6 : -1.15) - pr.z) * ease;
      const y =
        deskTop +
        0.3 +
        Math.sin(itemClock * 2 + i) * 0.04 +
        (r3.merged.includes(id) ? 0.3 : 0);
      pr.node.position.set(pr.x, y, pr.z);
      pr.sign.position.set(pr.x, y + 0.62, pr.z);
    });
    if (noteItem && noteItem.visible) {
      if (notePop >= 0) {
        notePop += dt;
        noteItem.scale.setScalar(noteItem.userData.base * (1 + notePop * 4));
        noteItem.position.y = deskTop + notePop * 2;
        noteItem.visible = notePop < 0.35;
      } else {
        noteItem.rotation.z = Math.sin(itemClock * 3) * 0.08;
      }
    }
    if (markNode) {
      markTime -= dt;
      const pop = Math.min(1, (1.4 - markTime) * 7);
      markNode.visible = markTime > 0;
      markNode.scale.setScalar(markNode.userData.base * pop);
      markNode.rotation.y = TO_CAMERA + Math.sin(itemClock * 5) * 0.2;
      if (markTime <= 0) {
        markNode = null;
      }
    }
  }

  const HOME = new THREE.Vector3(0, 0, 0);
  // Turned a little to the camera: from straight behind it is only a coat
  const HOME_FACE = -0.8;
  pig.setSitting(true);
  pig.object.position.copy(HOME);
  pig.object.rotation.y = HOME_FACE;
  pig.state = {
    running: false,
    airborne: false,
    ducking: false,
    speed: 0,
    height: 0,
  };

  /* ---------- The merge editor, in HTML ---------- */

  const win = el("div", "gr-w5", hud.layer);
  const titlebar = el("div", "gr-w5-titlebar", win);
  el("span", "gr-w5-dots", titlebar, "● ● ●");
  const fileName = el("span", "gr-w5-file", titlebar);
  const roundPill = el("span", "gr-w5-roundpill", titlebar);
  const timer = el("div", "gr-w5-timer", win);
  const timerFill = el("i", "", timer);
  const toolbar = el("div", "gr-w5-toolbar", win);
  const body = el("div", "gr-w5-body gr-scroll", win);
  const footer = el("div", "gr-w5-footer", win);
  const stamp = el("div", "gr-w5-stamp", win);
  stamp.setAttribute("aria-live", "polite");

  /* ---------- State ---------- */

  // The mistakes already paid for, and what was done differently from the best path
  const mistakes = new Set();
  const missed = [];

  let round = 1;
  let step = "merge";
  let resolved = 0;
  let noteFound = false;
  let busy = false;
  let clock = 0;
  let roundTime = 0;
  const timers = [];
  // Round 1: which sides were accepted, in the order they were, and the split
  const r1 = { accepted: [], split: false };
  // Round 2: which sides of the record page were accepted, in order
  const r2 = { accepted: [] };
  // Round 3: the order of the cards, and the one picked up with the keyboard
  const r3 = {
    order: ["052", "056", "062"],
    grabbed: null,
    merged: [],
    back: false,
  };

  // The keyboard: rows of buttons, and where the cursor is
  let rows = [];
  let cursor = { row: 0, col: 0 };

  // The guinea pig: a hop when right, a shake when wrong
  let hop = 0;
  let wobble = 0;

  function later(seconds, fn) {
    timers.push({ at: clock + seconds, fn });
  }

  // Where the confetti of a good move goes: the guinea pig's monitor
  const MONITOR = new THREE.Vector3(0, 1.6, -1.7);
  let shake = 0;
  let lastGoal = null;

  function happy(big) {
    ctx.sound.play(big ? "happy" : "wheek");
    hop = 0.4;
    ctx.fx.burst(MONITOR.x, MONITOR.y, MONITOR.z, {
      count: big ? 60 : 18,
      speed: big ? 4 : 2.5,
      up: big ? 4 : 2.5,
      life: big ? 1.4 : 0.9,
    });
  }

  function spark(count) {
    ctx.fx.burst(MONITOR.x, MONITOR.y, MONITOR.z, {
      count,
      speed: 2.2,
      up: 2.2,
      life: 0.8,
    });
  }

  function coach(key) {
    hud.coach(t(key), 2400);
  }

  /** The goal line: always the next thing to do, set only when it changes. */
  function setGoal(key) {
    if (key !== lastGoal) {
      lastGoal = key;
      hud.goal(key ? t(key) : "");
    }
  }

  function goalKey() {
    if (round === 1) {
      if (r1.accepted.length < 2) {
        return "g_r1_take";
      }
      if (!r1.split) {
        return "g_r1_split";
      }
      return r1.accepted[0] === "cur" ? "g_complete" : "g_r1_sort";
    }
    if (round === 2) {
      return r2.accepted.length < 2 ? "g_r1_take" : "g_complete";
    }
    if (round === 4) {
      if (boss.state === "push" || boss.state === "beaten") {
        return "g_boss_push";
      }
      if (boss.conflicts.some((c) => c.state === "wiped")) {
        return "g_boss_undo";
      }
      return boss.conflicts.every((c) => c.state === "kept") ? "g_complete" : "g_boss";
    }
    return r3.merged.length || busy ? "g_r3_merge" : "g_r3";
  }

  /** The buttons that move the merge on glow, so nobody wonders what to press. */
  function markNext() {
    const buttons = [...win.querySelectorAll(".gr-w5-btn")];
    const byText = (text) => buttons.filter((b) => b.textContent === text);
    let next = [];
    if (round < 3) {
      next = buttons.filter((b) => b.classList.contains("gr-w5-lensbtn"));
      if (round === 1 ? r1.split : r2.accepted.length === 2) {
        next.push(...byText("Complete Merge"));
      }
    }
    for (const b of next) {
      b.classList.add("is-next");
    }
  }

  /**
   * A mistake costs one attempt the first time only: the same mistake again
   * shakes the guinea pig and shows the tip, and the tip stays on screen.
   * The slips that teach nothing new (a file left with its markers, one side
   * forgotten, an order to fix) cost a few points and never an attempt, so a
   * player who reads the tips always finishes.
   */
  function wrong(key, title, tip, screen) {
    wobble = 1;
    if (ctx.engine.motion) {
      shake = 0.35;
    }
    coach("fix_" + key);
    showMark("fail");
    showScreen(screen || "bad");
    if (mistakes.has(key) || FREE_MISTAKES.includes(key)) {
      ctx.sound.play("wrong");
      hud.toast(title, "bad");
      hud.tip(tip);
      ctx.points(-SLIP_POINTS);
      mistakes.add(key);
    } else {
      mistakes.add(key);
      ctx.loseAttempt(title, tip);
    }
    // The cursor goes back to what needs fixing, never stays on the button that failed
    cursorOn(round === 1 && !noteFound ? 1 : 0);
    if (round === 4) {
      cursor.col = bossColumn(cursor.row);
      paintCursor();
    }
    if (ctx.playing) {
      later(1.4, () => showScreen(currentScreen()));
    }
  }

  function showScreen(kind) {
    mine.screen.material = screenMaterial(kind);
  }

  function currentScreen() {
    if (round === 1) {
      return "permset";
    }
    if (round === 2) {
      return "pageconflict";
    }
    if (round === 4) {
      return boss.state === "beaten" ? "protected" : "permset";
    }
    return "prs";
  }

  function publish() {
    ctx.setData("resolved", resolved);
    ctx.setData("round", round);
    ctx.setData("step", step);
  }

  /* ---------- Rendering ---------- */

  function render() {
    rows = [];
    body.replaceChildren();
    toolbar.replaceChildren();
    footer.replaceChildren();
    roundPill.textContent = t("round", { n: round });
    win.setAttribute("data-round", String(round));
    if (round === 1) {
      renderPermissionSet();
    } else if (round === 2) {
      renderPage();
    } else {
      renderPullRequests();
    }
    const hint = el(
      "span",
      "gr-w5-hint",
      footer,
      hud.touch
        ? t(round === 3 ? "touchR3" : "touch")
        : t(round === 3 ? "keysR3" : "keys"),
    );
    hint.setAttribute("aria-hidden", "true");
    footer.appendChild(footerButtons);
    markNext();
    setGoal(goalKey());
    clampCursor();
    paintCursor();
    publish();
  }

  // The footer buttons of the step being rendered (Complete Merge...)
  let footerButtons = document.createElement("div");

  function newFooter() {
    footerButtons = document.createElement("div");
    footerButtons.className = "gr-w5-footer-buttons";
    return footerButtons;
  }

  function task(text, extra) {
    el("p", "gr-w5-task", toolbar, text);
    if (extra) {
      toolbar.appendChild(extra);
    }
  }

  function button(parent, label, className, onPress) {
    const node = el(
      "button",
      "gr-button gr-w5-btn " + (className || ""),
      parent,
      label,
    );
    node.type = "button";
    node.tabIndex = -1;
    node.addEventListener("click", (event) => {
      event.preventDefault();
      node.blur();
      if (node.__dragged) {
        node.__dragged = false;
        return;
      }
      if (busy || !ctx.playing) {
        return;
      }
      moveCursorTo(node);
      onPress();
    });
    node.__press = onPress;
    return node;
  }

  function pane(parent, kind, title, detail) {
    const section = el("section", "gr-w5-pane gr-w5-pane--" + kind, parent);
    const head = el("header", "", section);
    el("strong", "", head, title);
    if (detail) {
      el("code", "", head, detail);
    }
    return el("div", "gr-w5-code", section);
  }

  let lineNumber = 0;
  function line(parent, text, kind) {
    lineNumber += 1;
    const node = el("div", "gr-w5-line" + (kind ? " is-" + kind : ""), parent);
    el("span", "gr-w5-ln", node, String(lineNumber));
    codeText(node, text);
    return node;
  }

  function lines(parent, list, kind) {
    for (const text of list) {
      line(parent, text, kind);
    }
  }

  function lens(parent) {
    return el("div", "gr-w5-lens", parent);
  }

  function done(parent, text) {
    return el("span", "gr-w5-done", parent, text || t("accepted"));
  }

  /** Victor's line, at the top of the Incoming file: a row above the first conflict. */
  function noteRow(parent) {
    if (noteFound) {
      return;
    }
    lineNumber += 1;
    const node = button(parent, "", "gr-w5-line gr-w5-noteline", () => {
      noteFound = true;
      notePop = 0;
      ctx.foundNote();
      ctx.sound.play("wheek");
      render();
    });
    node.replaceChildren();
    el("span", "gr-w5-ln", node, String(lineNumber));
    codeText(node, t("noteLine"));
    rows.push([node]);
  }

  function renderPermissionSet() {
    fileName.textContent = PERMSET_FILE;
    task(t("r1_task"));
    const grid = el("div", "gr-w5-grid", body);
    const accept = [];
    const hasIn = r1.accepted.includes("in");
    const hasCur = r1.accepted.includes("cur");

    const incoming = pane(grid, "in", "Incoming", "origin/integration");
    lineNumber = 0;
    noteRow(incoming);
    lines(incoming, ["<fieldPermissions>", "    <editable>true</editable>"]);
    const lensIn = lens(incoming);
    if (hasIn) {
      done(lensIn);
    } else {
      accept.push(
        button(lensIn, "Accept Incoming", "gr-w5-lensbtn", () =>
          acceptPermission("in"),
        ),
      );
    }
    line(incoming, FIELD_HERS, "in");
    lines(incoming, ["    <readable>true</readable>", "</fieldPermissions>"]);

    const current = pane(grid, "cur", "Current", "HEAD");
    lineNumber = 0;
    lines(current, ["<fieldPermissions>", "    <editable>true</editable>"]);
    const lensCur = lens(current);
    if (hasCur) {
      done(lensCur);
    } else {
      accept.push(
        button(lensCur, "Accept Current", "gr-w5-lensbtn", () =>
          acceptPermission("cur"),
        ),
      );
    }
    line(current, FIELD_YOURS, "cur");
    lines(current, ["    <readable>true</readable>", "</fieldPermissions>"]);
    if (accept.length) {
      rows.push(accept);
    }

    const result = pane(grid, "res", "Result", PERMSET_FILE);
    lineNumber = 0;
    lines(result, ["<fieldPermissions>", "    <editable>true</editable>"]);
    if (!r1.accepted.length) {
      line(result, HEAD, "marker");
      line(result, FIELD_YOURS, "cur");
      line(result, SPLIT, "marker");
      line(result, FIELD_HERS, "in");
      line(result, THEIRS, "marker");
    } else {
      const fieldOf = (side) => (side === "in" ? FIELD_HERS : FIELD_YOURS);
      line(result, fieldOf(r1.accepted[0]), r1.accepted[0]);
      if (r1.split) {
        lines(
          result,
          [
            "    <readable>true</readable>",
            "</fieldPermissions>",
            "<fieldPermissions>",
            "    <editable>true</editable>",
          ],
          "add",
        );
      }
      if (r1.accepted[1]) {
        line(result, fieldOf(r1.accepted[1]), r1.accepted[1]);
      }
    }
    lines(result, ["    <readable>true</readable>", "</fieldPermissions>"]);
    if (r1.accepted.length === 2) {
      const fix = lens(result);
      fix.classList.add("gr-w5-lens--result");
      if (!r1.split) {
        rows.push([button(fix, t("split"), "gr-w5-lensbtn", splitBlocks)]);
      } else if (r1.accepted[0] !== "cur") {
        rows.push([button(fix, t("sort"), "gr-w5-lensbtn", sortBlocks)]);
      }
    }
    const buttons = newFooter();
    rows.push([
      button(buttons, "Complete Merge", "gr-w5-primary", completePermissionSet),
    ]);
  }

  function renderPage() {
    fileName.textContent = PAGE_FILE;
    task(t("r2_task"));
    const grid = el("div", "gr-w5-grid", body);
    const accept = [];
    for (const [side, title, detail, label] of [
      ["in", "Incoming", "origin/integration", "Accept Incoming"],
      ["cur", "Current", "HEAD", "Accept Current"],
    ]) {
      const code = pane(grid, side, title, detail);
      lineNumber = 0;
      const box = lens(code);
      if (r2.accepted.includes(side)) {
        done(box);
      } else {
        accept.push(
          button(box, label, "gr-w5-lensbtn", () => acceptPage(side)),
        );
      }
      lines(code, PAGE_FIELDS[side], side);
    }
    if (accept.length) {
      rows.push(accept);
    }
    const result = pane(grid, "res", "Result", PAGE_FILE);
    lineNumber = 0;
    if (!r2.accepted.length) {
      line(result, HEAD, "marker");
      lines(result, PAGE_FIELDS.cur, "cur");
      line(result, SPLIT, "marker");
      lines(result, PAGE_FIELDS.in, "in");
      line(result, THEIRS, "marker");
    } else {
      for (const side of r2.accepted) {
        lines(result, PAGE_FIELDS[side], side);
      }
    }
    const buttons = newFooter();
    rows.push([
      button(buttons, "Complete Merge", "gr-w5-primary", completePage),
    ]);
  }

  function renderPullRequests() {
    fileName.textContent = t("prList");
    task(t("r3_task"));
    const list = el("ol", "gr-w5-prs", body);
    r3.order.forEach((id, i) => {
      const pr = PRS[id];
      const item = el("li", "gr-w5-pritem", list);
      el(
        "span",
        "gr-w5-slot" + (i === 2 ? " is-back" : ""),
        item,
        t("slot" + (i + 1)),
      );
      const card = button(
        item,
        "",
        "gr-w5-pr" +
          (r3.grabbed === id ? " is-grabbed" : "") +
          (r3.merged.includes(id) ? " is-merged" : "") +
          (r3.back && id === "062" ? " is-back" : ""),
        () => grabCard(id),
      );
      card.replaceChildren();
      card.setAttribute("data-pr", id);
      const head = el("span", "gr-w5-prhead", card);
      el("span", "gr-w5-prnum", head, "#" + pr.n);
      el("strong", "", head, pr.title);
      const meta = el("span", "gr-w5-prmeta", card);
      el(
        "span",
        "gr-w5-check " + (pr.ok ? "is-ok" : "is-ko"),
        meta,
        pr.ok ? t("checksGreen") : t("checksFailing"),
      );
      el("span", "", meta, pr.author);
      el("span", "gr-w5-prtouch", card, pr.touches + " · " + t(pr.size));
      if (r3.merged.includes(id)) {
        el("span", "gr-w5-prstate is-merged", card, t("merged"));
      } else if (r3.back && id === "062") {
        el("span", "gr-w5-prstate is-back", card, t("backToAuthor"));
      }
      const arrows = el("span", "gr-w5-arrows", item);
      const up = button(arrows, "▲", "gr-w5-move", () => moveCard(id, -1));
      up.setAttribute("aria-label", t("moveUp"));
      const down = button(arrows, "▼", "gr-w5-move", () => moveCard(id, 1));
      down.setAttribute("aria-label", t("moveDown"));
      card.addEventListener("pointerdown", (event) =>
        startDrag(event, card, id, list),
      );
      rows.push([card, up, down]);
    });
    const buttons = newFooter();
    rows.push([
      button(buttons, t("mergeOrder"), "gr-w5-primary", mergeInOrder),
    ]);
  }

  /* ---------- The keyboard cursor ---------- */

  function clampCursor() {
    if (!rows.length) {
      cursor = { row: 0, col: 0 };
      return;
    }
    cursor.row = Math.max(0, Math.min(cursor.row, rows.length - 1));
    cursor.col = Math.max(0, Math.min(cursor.col, rows[cursor.row].length - 1));
  }

  function paintCursor() {
    for (const node of win.querySelectorAll(".is-cursor")) {
      node.classList.remove("is-cursor");
    }
    const node = rows[cursor.row] && rows[cursor.row][cursor.col];
    if (node) {
      node.classList.add("is-cursor");
      if (node.scrollIntoView) {
        node.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    }
  }

  function moveCursorTo(node) {
    rows.forEach((row, r) => {
      const c = row.indexOf(node);
      if (c >= 0) {
        cursor = { row: r, col: c };
      }
    });
  }

  /** Puts the cursor on the first row holding a button with this class, or on a row. */
  function cursorOn(rowIndex) {
    cursor = { row: rowIndex, col: 0 };
    clampCursor();
    paintCursor();
  }

  /* ---------- Round 1: the permission set ---------- */

  function acceptPermission(side) {
    if (r1.accepted.includes(side)) {
      return;
    }
    r1.accepted.push(side);
    ctx.sound.play("click");
    if (r1.accepted.length === 2) {
      ctx.collect(60, t("ok_both"));
      happy();
      coach("co_read");
    } else {
      spark(10);
    }
    render();
    // The cursor goes where the eye should go next: the Result
    cursorOn(rows.length - 2);
  }

  function splitBlocks() {
    r1.split = true;
    ctx.sound.play("pickup");
    spark(14);
    render();
    cursorOn(rows.length - (r1.accepted[0] === "cur" ? 1 : 2));
  }

  function sortBlocks() {
    r1.accepted.reverse();
    ctx.sound.play("pickup");
    render();
    cursorOn(rows.length - 1);
  }

  function completePermissionSet() {
    const n = r1.accepted.length;
    if (n === 0) {
      wrong("marker", t("e_marker"), t("e_marker_tip"));
      return;
    }
    if (n === 1) {
      wrong(
        "oneSide",
        r1.accepted[0] === "in" ? t("e_lostYours") : t("e_lostHers"),
        t("e_oneSide_tip"),
      );
      return;
    }
    if (!r1.split) {
      wrong("dup", t("e_dup"), t("e_dup_tip"), "dup");
      return;
    }
    const sorted = r1.accepted[0] === "cur";
    if (!sorted) {
      missed.push("info_unsorted");
    }
    resolved += 1;
    ctx.collect(sorted ? 200 : 80, t(sorted ? "ok_r1" : "ok_r1_unsorted"));
    endRound();
  }

  /* ---------- Round 2: the record page ---------- */

  function acceptPage(side) {
    if (r2.accepted.includes(side)) {
      return;
    }
    r2.accepted.push(side);
    ctx.sound.play("click");
    if (r2.accepted.length === 2) {
      ctx.collect(60, t("ok_page"));
      happy();
      coach("co_read");
    } else {
      spark(10);
    }
    render();
    // Both taken: the cursor goes to Complete Merge, else to the other side
    cursorOn(r2.accepted.length === 2 ? rows.length - 1 : 0);
  }

  function completePage() {
    const n = r2.accepted.length;
    if (n === 0) {
      wrong("marker", t("e_marker"), t("e_marker_tip"));
      return;
    }
    if (n === 1) {
      wrong(
        "page",
        r2.accepted[0] === "in" ? t("e_pageLostYours") : t("e_pageLostHers"),
        t("e_page_tip"),
      );
      return;
    }
    resolved += 1;
    ctx.collect(150, "Complete Merge");
    endRound();
  }

  /* ---------- Round 3: three Pull Requests ---------- */

  function grabCard(id) {
    r3.grabbed = r3.grabbed === id ? null : id;
    ctx.sound.play("click");
    render();
  }

  function moveCard(id, delta) {
    const i = r3.order.indexOf(id);
    const j = i + delta;
    if (j < 0 || j >= r3.order.length) {
      return;
    }
    r3.order.splice(i, 1);
    r3.order.splice(j, 0, id);
    ctx.sound.play("click");
    const col = cursor.col;
    render();
    cursor = { row: j, col };
    clampCursor();
    paintCursor();
  }

  // Dragging a card with a finger or a mouse: the list is reordered in place
  function startDrag(event, card, id, list) {
    if (busy || !ctx.playing || event.button > 0) {
      return;
    }
    const startY = event.clientY;
    let dragging = false;
    const item = card.parentNode;
    const move = (e) => {
      if (!dragging && Math.abs(e.clientY - startY) < 8) {
        return;
      }
      if (!dragging) {
        dragging = true;
        item.classList.add("is-dragging");
      }
      e.preventDefault();
      // The new place is the number of other cards whose middle is above the finger
      const items = [...list.children];
      let target = 0;
      for (const other of items) {
        if (other !== item) {
          const rect = (
            other.querySelector(".gr-w5-pr") || other
          ).getBoundingClientRect();
          if (rect.top + rect.height / 2 < e.clientY) {
            target += 1;
          }
        }
      }
      const from = r3.order.indexOf(id);
      if (target !== from) {
        r3.order.splice(from, 1);
        r3.order.splice(target, 0, id);
        const rest = items.filter((other) => other !== item);
        list.insertBefore(item, rest[target] || null);
        ctx.sound.play("click");
      }
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      dragCleanup = null;
      if (dragging) {
        card.__dragged = true;
        window.setTimeout(() => {
          card.__dragged = false;
        }, 50);
        render();
        cursorOn(r3.order.indexOf(id));
      }
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    dragCleanup = up;
  }
  let dragCleanup = null;

  function mergeInOrder() {
    r3.grabbed = null;
    if (r3.order[2] !== "062") {
      render();
      wrong("failing", t("e_failing"), t("e_failing_tip"));
      return;
    }
    if (r3.order[0] !== "056") {
      render();
      wrong("smaller", t("e_smaller"), t("e_smaller_tip"));
      return;
    }
    resolved += 1;
    ctx.collect(200, t("ok_r3"));
    happy();
    busy = true;
    win.classList.add("is-busy");
    addTimeBonus();
    publish();
    setGoal("g_r3_merge");
    // One at a time, each deployment finished before the next merge
    later(0.8, () => {
      r3.merged.push("056");
      hud.tick(t("tickMerged", { n: 2, title: PRS["056"].title }));
      hud.chat("romain", t("c_romain3"), 4000);
      ctx.sound.play("gate");
      render();
    });
    later(1.8, () => hud.tick(t("tickDeployed")));
    later(2.6, () => {
      r3.merged.push("052");
      hud.tick(t("tickMerged", { n: 1, title: PRS["052"].title }));
      ctx.sound.play("gate");
      render();
    });
    later(3.5, () => {
      r3.back = true;
      hud.tick(t("tickBack"));
      hud.chat("mariia", t("c_mariia3"), 4000);
      render();
    });
    later(4.6, () => {
      flashStamp(t("stampRelease"), true);
      showScreen("released");
      happy(true);
      ctx.fx.burst(pig.object.position.x, 1.2, pig.object.position.z, {
        count: 80,
        speed: 5,
        up: 6,
        life: 1.8,
      });
    });
    // Then the boss: one more merge with Mariia, and an admin in a hurry
    later(6.2, () => startBoss(false));
  }

  /* ---------- Rounds ---------- */

  function addTimeBonus() {
    const left = Math.max(0, 1 - roundTime / ROUND_SECONDS[round - 1]);
    const bonus = Math.round(TIME_BONUS * left);
    if (bonus > 0) {
      ctx.points(bonus);
      later(1.1, () => hud.toast(t("timeBonus", { n: bonus }), "power"));
    }
  }

  function flashStamp(text, stay) {
    stamp.textContent = text;
    stamp.classList.remove("is-shown");
    void stamp.offsetWidth;
    stamp.classList.add("is-shown");
    if (!stay) {
      later(1.3, () => stamp.classList.remove("is-shown"));
    }
  }

  function endRound() {
    happy(true);
    showMark("pass");
    addTimeBonus();
    busy = true;
    win.classList.add("is-busy");
    flashStamp(t("stampMerge"));
    showScreen("ok");
    publish();
    later(1.6, () => startRound(round + 1));
  }

  function startRound(n) {
    round = n;
    step = n === 3 ? "triage" : "merge";
    roundTime = 0;
    busy = false;
    win.classList.remove("is-busy");
    showScreen(currentScreen());
    render();
    cursorOn(0);
    coach("co_r" + n);
    if (n === 1) {
      // The cursor starts on the conflict, not on Victor's line above it
      cursorOn(noteFound ? 0 : 1);
    }
    if (n === 2) {
      talking = 4;
      hud.chat("mariia", t("c_mariia2"), 5000);
    }
  }

  /* ---------- The boss: the admin who accepts his side everywhere ---------- */

  const boss = {
    on: false,
    // off, fight, push (his git push --force), beaten
    state: "off",
    file: 0,
    conflicts: [],
    hp: BOSS_HP,
    // What he does: wait, move, windup, stunned, sulk
    ai: "wait",
    aiTime: 0,
    windup: 1,
    targets: [],
    second: false,
    // Slower after each lost heart
    ease: 1,
    wipes: 0,
    caught: 0,
    lost: 0,
    // The 3D figure: walking in, the arm that clicks, the slump at the end
    walk: 0,
    click: 0,
    flinch: 0,
    slump: 0,
    leave: 0,
    // The HTML pointer: where it is, where it goes, and when to measure again
    x: 0,
    y: 0,
    wantX: 0,
    wantY: 0,
    measureIn: 0,
    placed: false,
    typing: null,
    lastMissSay: -10,
    autoplay: false,
    think: 0,
    autoIn: 0,
    autoWaited: 0,
    startedAt: 0,
  };

  // The life bar under the top bar, with his face
  const bossBar = el("div", "gr-w5-bossbar", hud.extra);
  bossBar.hidden = true;
  faceImage(el("span", "gr-w5-bossface", bossBar));
  el("strong", "", bossBar, t("bossName"));
  const bossFill = el("b", "", el("i", "", bossBar));
  // His pointer in the editor: an arrow, his face ringed by the time left before he clicks, his name
  const pointer = el("div", "gr-w5-admin", win);
  pointer.hidden = true;
  pointer.setAttribute("aria-hidden", "true");
  const arrow = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  arrow.setAttribute("viewBox", "0 0 20 26");
  const arrowPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  arrowPath.setAttribute("d", "M1 1 L1 21 L6.5 16 L10 24.5 L13.5 23 L10 15 L17.5 15 Z");
  arrow.appendChild(arrowPath);
  pointer.appendChild(arrow);
  faceImage(el("span", "gr-w5-admin-face", pointer));
  el("span", "gr-w5-admin-tag", pointer, "Dev");
  // What he says, in a bubble with his face
  const adminSay = el("div", "gr-w5-say", hud.layer);
  adminSay.hidden = true;
  adminSay.setAttribute("aria-live", "polite");
  faceImage(el("span", "gr-w5-say-face", adminSay));
  const sayBody = el("div", "", adminSay);
  el("strong", "", sayBody, t("bossName"));
  const sayText = el("span", "", sayBody);
  let sayUntil = 0;
  // Until when his last line is being read: a reaction does not replace it before
  let sayRead = 0;
  let sayPending = null;
  let completeButton = null;

  // A finger on the list: nothing scrolls under it for a moment
  let touchedAt = -10;
  for (const type of ["pointerdown", "wheel", "touchmove"]) {
    body.addEventListener(type, () => {
      touchedAt = clock;
    }, { passive: true });
  }

  /** On a small screen, what he goes for is scrolled into view: he never clicks out of sight. */
  function reveal(c) {
    if (!c || !c.node || !c.node.isConnected || clock - touchedAt < 0.8) {
      return;
    }
    const b = body.getBoundingClientRect();
    const r = c.node.getBoundingClientRect();
    if (r.top < b.top + 2 || r.bottom > b.bottom - 2) {
      const top = body.scrollTop + r.top - b.top - Math.max(0, (b.height - r.height) / 2);
      body.scrollTo({ top: Math.max(0, top), behavior: ctx.engine.motion ? "smooth" : "auto" });
    }
  }

  /** His portrait in an HTML circle; a plain circle if it does not load. */
  function faceImage(holder) {
    const image = el("img", "", holder);
    image.alt = "";
    image.decoding = "async";
    image.addEventListener("error", () => image.remove());
    image.src = adminFaceUrl;
    return image;
  }

  // The check plays the boss by itself (window.__guineaRun only exists for checks)
  if (window.__guineaRun) {
    window.__guineaRun.w5 = {
      autoplay(on, think) {
        boss.autoplay = on !== false;
        // A playtest at a human pace: one move every `think` seconds, no waiting for his first click
        boss.think = think || 0;
      },
    };
  }

  function publishBoss() {
    ctx.setData("boss", boss.state);
    ctx.setData("wipes", boss.wipes);
    ctx.setData("caught", boss.caught);
    ctx.setData("bossfile", boss.file);
    ctx.setData("hp", boss.hp);
  }

  function startBoss(retry) {
    round = 4;
    ctx.bossStarted();
    step = "boss";
    boss.on = true;
    boss.startedAt = clock;
    boss.state = "fight";
    boss.hp = BOSS_HP;
    boss.ease = retry ? 1.3 : 1;
    boss.walk = 0;
    stamp.classList.remove("is-shown");
    win.classList.add("is-boss");
    bossBar.hidden = false;
    renderBossBar();
    admin.group.visible = true;
    admin.face.visible = true;
    admin.sign.visible = true;
    pointer.hidden = false;
    boss.placed = false;
    // A tap race: the pads go, so the whole file fits above the bottom of a phone
    if (hud.touch) {
      hud.setPads([]);
    }
    ctx.sound.play("bossIn");
    coach("co_boss");
    // A player who lost a lot comes to the admin with a heart back
    if (ctx.attempts < 3) {
      ctx.gainAttempt();
    }
    openBossFile(0);
    // He talks first, then goes for the mouse
    boss.ai = "wait";
    boss.aiTime = 2.6;
    bossSay(t("b_arrive"), 3.4);
    later(3.6, () => {
      talking = 3;
      hud.chat("mariia", t("c_mariia_boss"), 4200);
    });
  }

  function openBossFile(i) {
    boss.file = i;
    // A conflict: open, wiped (one side gone, Undo running), lost (a heart), or kept
    boss.conflicts = BOSS_FILES[i].conflicts.map(([tag, cur, inc]) => ({
      tag,
      cur,
      in: inc,
      state: "open",
      wiped: null,
      by: null,
      at: 0,
      node: null,
      buttons: [],
      link: null,
      undo: null,
    }));
    boss.targets = [];
    boss.second = false;
    boss.ai = "wait";
    boss.aiTime = 1.3 * boss.ease;
    busy = false;
    win.classList.remove("is-busy");
    showScreen(currentScreen());
    ctx.setData("pace", BOSS_PACE[i]);
    renderBoss();
    cursorOn(0);
    cursor.col = bossColumn(0);
    paintCursor();
    if (i === 2) {
      coach("co_double");
    }
    publishBoss();
  }

  function renderBoss() {
    rows = [];
    body.replaceChildren();
    toolbar.replaceChildren();
    footer.replaceChildren();
    fileName.textContent = BOSS_FILES[boss.file].name;
    roundPill.textContent = t("bossFile", { n: boss.file + 1, total: BOSS_FILES.length });
    win.setAttribute("data-round", "4");
    task(t("r4_task"));
    const list = el("div", "gr-w5-cfs", body);
    for (const c of boss.conflicts) {
      c.node = el("div", "gr-w5-cf", list);
      drawConflict(c);
    }
    const hint = el("span", "gr-w5-hint", footer, hud.touch ? t("touchBoss") : t("keys"));
    hint.setAttribute("aria-hidden", "true");
    const buttons = newFooter();
    completeButton = button(buttons, "Complete Merge", "gr-w5-primary", completeBossFile);
    footer.appendChild(buttons);
    bossRows();
    markBoss();
    setGoal(goalKey());
    clampCursor();
    paintCursor();
    publish();
  }

  /** One conflict as VS Code draws it in the file: its links, the markers, your block and hers. */
  function drawConflict(c) {
    const node = c.node;
    node.replaceChildren();
    node.className = "gr-w5-cf is-" + c.state + (boss.targets.includes(c) ? " is-targeted" : "");
    c.buttons = [];
    c.link = null;
    c.undo = null;
    if (c.state === "open") {
      const lensRow = el("div", "gr-w5-cf-lens", node);
      c.link = button(lensRow, "Accept Current Change", "gr-w5-link is-current", () => bossAccept(c, "cur"));
      const incoming = button(lensRow, "Accept Incoming Change", "gr-w5-link", () => bossAccept(c, "in"));
      const both = button(lensRow, "Accept Both Changes", "gr-w5-link is-both", () => bossAccept(c, "both"));
      c.buttons = [c.link, incoming, both];
      // A phone has no room for the tag on each line: it reads it once, by the marker
      el("span", "gr-w5-cf-marktag", el("div", "gr-w5-cf-mark is-cur", node, HEAD), "<" + c.tag + ">");
      blockLine(node, c, "cur");
      el("div", "gr-w5-cf-mark", node, SPLIT);
      blockLine(node, c, "in");
      el("div", "gr-w5-cf-mark is-in", node, THEIRS);
    } else if (c.state === "wiped") {
      const bar = el("div", "gr-w5-cf-undo", node);
      c.undo = button(bar, t("b_undo"), "gr-w5-undo", () => bossUndo(c));
      c.undo.style.setProperty("--left", "1");
      el("span", "gr-w5-cf-what", bar, t(c.wiped === "in" ? "b_wipedHers" : "b_wipedYours"));
      c.buttons = [c.undo];
      blockLine(node, c, c.wiped === "in" ? "cur" : "in");
      blockLine(node, c, c.wiped, "is-struck");
    } else if (c.state === "lost") {
      blockLine(node, c, c.wiped === "in" ? "cur" : "in");
      blockLine(node, c, c.wiped, "is-gone");
    } else {
      done(node, t("b_kept")).classList.add("gr-w5-cf-ok");
      blockLine(node, c, "cur");
      blockLine(node, c, "in");
    }
  }

  /** A whole block, folded on one line: its tag, the name it grants, and whose it is. */
  function blockLine(parent, c, side, extra) {
    const row = el("div", "gr-w5-cf-line is-" + side + (extra ? " " + extra : ""), parent);
    el("span", "gr-w5-cf-tag", row, "<" + c.tag + ">");
    el("b", "", row, c[side].replace(/\./g, ".​"));
    el("span", "gr-w5-cf-fold", row, "⋯");
    el("span", "gr-w5-cf-who", row, side === "in" ? "Mariia" : t("b_you"));
    return row;
  }

  // The keyboard: a row per conflict that still has buttons, then Complete Merge
  function bossRows() {
    rows = boss.conflicts.filter((c) => c.buttons.length).map((c) => c.buttons);
    if (completeButton) {
      rows.push([completeButton]);
    }
  }

  /** On a conflict, the keyboard lands on Accept Both Changes: Enter is never his button. */
  function bossColumn(row) {
    return rows[row] && rows[row].length === 3 ? 2 : 0;
  }

  /** Draws one conflict again, in place: a tap on another one is never lost to a redraw. */
  function refreshConflict(c) {
    const was = rows[cursor.row];
    const on = boss.conflicts.find((x) => x.buttons === was);
    drawConflict(c);
    bossRows();
    if (on) {
      const r = rows.indexOf(on.buttons);
      if (r >= 0) {
        cursor = { row: r, col: on === c ? bossColumn(r) : cursor.col };
      }
    }
    clampCursor();
    paintCursor();
    markBoss();
    setGoal(goalKey());
    boss.measureIn = 0;
    publishBoss();
  }

  function markBoss() {
    for (const node of win.querySelectorAll(".gr-w5-btn.is-next")) {
      node.classList.remove("is-next");
    }
    const allKept = boss.conflicts.every((c) => c.state === "kept");
    if (allKept && completeButton) {
      completeButton.classList.add("is-next");
    }
    for (const c of boss.conflicts) {
      if (c.undo) {
        c.undo.classList.add("is-next");
      }
    }
  }

  /** A click on one of the three links of a conflict, by the player. */
  function bossAccept(c, how) {
    if (c.state !== "open" || boss.state !== "fight") {
      return;
    }
    if (how !== "both") {
      // One side only: the other one leaves the file, as his click does
      ctx.sound.play("wrong");
      ctx.points(-SLIP_POINTS);
      wobble = 0.7;
      hud.toast(t(how === "cur" ? "b_self" : "b_selfYours"), "bad");
      coach("fix_wipe");
      wipe(c, how === "cur" ? "in" : "cur", "you");
      return;
    }
    c.state = "kept";
    const first = boss.targets.includes(c);
    ctx.sound.play("bossHit");
    hitBoss();
    ctx.collect(first ? 100 : 60, t(first ? "b_first" : "b_kept"));
    spark(first ? 24 : 14);
    if (first) {
      missTarget(c);
    }
    refreshConflict(c);
    if (boss.conflicts.every((x) => x.state === "kept")) {
      happy();
      cursorOn(rows.length - 1);
    }
  }

  /** One side of a conflict leaves the file: Undo brings it back for a few seconds. */
  function wipe(c, side, by) {
    c.state = "wiped";
    c.wiped = side;
    c.by = by;
    c.at = clock;
    boss.targets = boss.targets.filter((x) => x !== c);
    if (by === "admin") {
      boss.wipes += 1;
      ctx.sound.play("adminClick");
      reveal(c);
      wobble = 0.6;
      if (ctx.engine.motion) {
        shake = 0.25;
      }
    }
    showMark("fail");
    refreshConflict(c);
  }

  function bossUndo(c) {
    if (c.state !== "wiped") {
      return;
    }
    const byHim = c.by === "admin";
    c.state = "open";
    c.wiped = null;
    c.by = null;
    if (byHim) {
      boss.caught += 1;
      ctx.sound.play("bossHit");
      hitBoss();
      ctx.collect(80, t("b_caughtToast"));
      spark(20);
      bossSay(t("b_caught"), 1.6, true);
      // Caught red-handed: he steps back a moment
      setTargets([]);
      pointer.style.setProperty("--p", "0");
      boss.second = false;
      boss.ai = "stunned";
      boss.aiTime = 1.5 * boss.ease;
      pointer.classList.remove("is-stunned");
      void pointer.offsetWidth;
      pointer.classList.add("is-stunned");
      boss.flinch = 1;
    } else {
      ctx.sound.play("pickup");
    }
    refreshConflict(c);
  }

  /** A wiped line nobody brought back: a heart, and Mariia puts her line back. */
  function loseLine(c) {
    const side = c.wiped;
    const name = side === "in" ? c.in : c.cur;
    boss.lost += 1;
    // Mercy: he slows down, and waits before his next click
    boss.ease = Math.min(BOSS_EASE_MAX, boss.ease * 1.25);
    setTargets([]);
    pointer.style.setProperty("--p", "0");
    boss.second = false;
    boss.ai = "wait";
    boss.aiTime = 2.6;
    if (!missed.includes("info_lost")) {
      missed.push("info_lost");
    }
    // The last heart: the result card says the next try starts at the admin
    const last = ctx.attempts <= 1;
    const tip = t(side === "in" ? "b_lost_tip" : "b_lostYours_tip") + (last ? " " + t("retryHint") : "");
    wobble = 1;
    c.state = "lost";
    drawConflict(c);
    ctx.loseAttempt(t(side === "in" ? "b_lostHers" : "b_lostYours", { name }), tip);
    if (!ctx.playing) {
      bossRetryAt = Date.now();
      return;
    }
    refreshConflict(c);
    later(1.3, () => {
      if (c.state !== "lost") {
        return;
      }
      c.state = "open";
      c.wiped = null;
      c.by = null;
      refreshConflict(c);
      if (side === "in") {
        talking = 3;
        hud.chat("mariia", t("c_mariia_back", { name }), 4200);
      }
    });
  }

  /** The bar never empties before the push: the branch protection takes the last bite. */
  function hitBoss() {
    boss.hp = Math.max(1, boss.hp - 1);
    boss.flinch = 1;
    renderBossBar();
  }

  function renderBossBar() {
    bossFill.style.width = Math.max(0, (boss.hp / BOSS_HP) * 100) + "%";
    bossBar.classList.toggle("is-low", boss.hp > 0 && boss.hp <= 3);
    bossBar.classList.toggle("is-down", boss.state === "beaten");
  }

  function completeBossFile() {
    if (boss.state !== "fight") {
      return;
    }
    if (boss.conflicts.some((c) => c.state !== "kept")) {
      wrong("marker", t("e_marker"), t("e_marker_tip"));
      return;
    }
    busy = true;
    win.classList.add("is-busy");
    boss.targets = [];
    boss.ai = "sulk";
    ctx.collect(100, "Complete Merge");
    happy(true);
    showMark("pass");
    flashStamp(t("stampMerge"));
    showScreen("ok");
    const last = boss.file === BOSS_FILES.length - 1;
    if (last) {
      later(1.4, startPush);
    } else {
      bossSay(t(["b_next", "b_angry", "b_last"][boss.file]), 2.2);
      later(1.6, () => openBossFile(boss.file + 1));
    }
    publishBoss();
  }

  /* His moves: pick a conflict, go to its Accept Current Change, hover it, click */

  function runAdmin(dt) {
    boss.aiTime -= dt;
    if (boss.ai === "sulk") {
      if (boss.conflicts.some((c) => c.state === "open")) {
        boss.ai = "wait";
        boss.aiTime = 0.4;
      }
      return;
    }
    if (boss.ai === "wait" || boss.ai === "stunned") {
      if (boss.aiTime <= 0) {
        pickTargets();
      }
      return;
    }
    if (boss.ai === "move") {
      if (boss.aiTime <= 0) {
        boss.ai = "windup";
        boss.windup = (boss.second ? 0.75 : boss.targets.length > 1 ? 1.5 : BOSS_WINDUP[boss.file]) * boss.ease;
        boss.aiTime = boss.windup;
      }
      return;
    }
    if (boss.ai === "windup") {
      pointer.style.setProperty("--p", Math.min(1, 1 - boss.aiTime / boss.windup).toFixed(3));
      if (boss.aiTime <= 0) {
        clickTarget();
      }
    }
  }

  function pickTargets() {
    const open = boss.conflicts.filter((c) => c.state === "open");
    pointer.style.setProperty("--p", "0");
    if (!open.length) {
      boss.ai = "sulk";
      setTargets([]);
      return;
    }
    let picks;
    if (boss.file === 0) {
      // From the bottom up: the race meets in the middle of the file
      picks = [open[open.length - 1]];
    } else if (boss.file >= 2 && open.length > 1 && boss.lost < 2) {
      // The last two files: two at a time, unless two lines were already lost
      picks = open.slice(-2);
    } else {
      picks = [open[Math.floor(ctx.random() * open.length)]];
    }
    boss.second = false;
    setTargets(picks);
    reveal(picks[picks.length - 1]);
    reveal(picks[0]);
    boss.ai = "move";
    boss.aiTime = 0.45;
  }

  function setTargets(list) {
    const before = boss.targets;
    boss.targets = list;
    for (const c of new Set([...before, ...list])) {
      if (c.node) {
        c.node.classList.toggle("is-targeted", list.includes(c));
      }
    }
    boss.measureIn = 0;
  }

  function clickTarget() {
    const c = boss.targets[0];
    boss.click = 1;
    pointer.classList.remove("is-click");
    void pointer.offsetWidth;
    pointer.classList.add("is-click");
    pointer.style.setProperty("--p", "0");
    if (c && c.state === "open") {
      wipe(c, "in", "admin");
    }
    const rest = boss.targets.filter((x) => x !== c && x.state === "open");
    setTargets(rest);
    if (rest.length) {
      boss.second = true;
      boss.ai = "move";
      boss.aiTime = 0.25;
    } else {
      boss.ai = "wait";
      boss.aiTime = BOSS_PAUSE[boss.file] * boss.ease;
    }
  }

  /** The player kept both sides of the conflict he was about to click. */
  function missTarget(c) {
    const rest = boss.targets.filter((x) => x !== c);
    setTargets(rest);
    if (!rest.length) {
      boss.ai = "wait";
      boss.aiTime = 0.9 * boss.ease;
      pointer.style.setProperty("--p", "0");
      if (clock - boss.lastMissSay > 6) {
        boss.lastMissSay = clock;
        bossSay(t("b_missed"), 1.5, true);
      }
    }
  }

  function bossSay(text, seconds, reaction) {
    // A quip never cuts a line still being read; a new line waits its turn (the newest only)
    if (clock < sayRead) {
      if (!reaction) {
        sayPending = [text, seconds];
      }
      return;
    }
    sayPending = null;
    const read = readingMs(text) / 1000;
    sayRead = clock + (reaction ? 0.6 * read : read);
    seconds = Math.max(seconds, read);
    sayText.textContent = text;
    adminSay.hidden = false;
    adminSay.classList.remove("is-new");
    void adminSay.offsetWidth;
    adminSay.classList.add("is-new");
    sayUntil = clock + seconds;
  }

  /* The twist: his git push --force, and the branch protection of the integration branch */

  function startPush() {
    boss.state = "push";
    boss.targets = [];
    stamp.classList.remove("is-shown");
    // Nothing to press, but the terminal is read in full colour
    win.classList.remove("is-busy");
    bossSay(t("b_push"), 3);
    rows = [];
    body.replaceChildren();
    toolbar.replaceChildren();
    footer.replaceChildren();
    completeButton = null;
    fileName.textContent = "Terminal";
    roundPill.textContent = "integration";
    const term = el("div", "gr-w5-term", body);
    boss.typing = { node: el("div", "gr-w5-term-cmd", term), at: 0 };
    setGoal(goalKey());
    PUSH_REPLY.forEach((text, i) => {
      later(2.4 + i * 0.32, () => {
        el("div", "gr-w5-term-err", term, text);
        ctx.sound.play(i === 0 ? "wrong" : "click");
      });
    });
    later(2.4 + PUSH_REPLY.length * 0.32 + 0.3, rejectPush);
    publishBoss();
  }

  function rejectPush() {
    ctx.bossBeaten();
    // How long the fight took, in game time, for playtests
    ctx.setData("bosstime", (clock - boss.startedAt).toFixed(1));
    boss.state = "beaten";
    boss.hp = 0;
    bossRetryAt = 0;
    renderBossBar();
    // The theme slows back down: the fight is over
    ctx.setData("pace", 1);
    ctx.sound.play("pushRejected");
    ctx.sound.play("bossDown");
    stamp.classList.add("is-protected");
    flashStamp(t("stampProtected"), true);
    showScreen("protected");
    coach("co_protected");
    ctx.collect(300, t("b_held"));
    pointer.hidden = true;
    boss.flinch = 1;
    if (ctx.engine.motion) {
      shake = 0.4;
    }
    ctx.fx.burst(MONITOR.x, MONITOR.y, MONITOR.z, { count: 70, speed: 4.5, up: 4.5, life: 1.5 });
    later(1.3, () => {
      bossSay(t("b_giveUp"), 3.4);
      hud.toast(t("b_beaten"), "power");
    });
    later(3.4, () => {
      talking = 3;
      hud.chat("mariia", t("c_mariia_end"), 4000);
    });
    later(6.4, () => {
      stamp.classList.remove("is-shown");
      ctx.finish(0, missed.map((key) => t(key)).join(" "));
    });
    setGoal(goalKey());
    publishBoss();
  }

  /** What the check does in place of a player: lets him click once, catches it, keeps both everywhere. */
  function autoplayStep(dt) {
    boss.autoIn -= dt;
    if (boss.autoIn > 0) {
      return;
    }
    boss.autoIn = boss.think || 0.45;
    const wiped = boss.conflicts.find((c) => c.state === "wiped" && clock - c.at > 0.6);
    if (wiped) {
      bossUndo(wiped);
      return;
    }
    if (!boss.think && !boss.wipes && boss.autoWaited < 14) {
      boss.autoWaited += 0.45;
      return;
    }
    const open =
      boss.conflicts.find((c) => c.state === "open" && !boss.targets.includes(c)) ||
      boss.conflicts.find((c) => c.state === "open");
    if (open) {
      bossAccept(open, "both");
    } else if (boss.conflicts.every((c) => c.state === "kept")) {
      completeBossFile();
    }
  }

  function updateBoss(dt) {
    if (!boss.on) {
      return;
    }
    if (boss.state === "fight" && !busy) {
      for (const c of boss.conflicts) {
        if (c.state !== "wiped") {
          continue;
        }
        // Mercy: after a lost line, the next ones wait longer for Undo
        const left = 1 - (clock - c.at) / (BOSS_CATCH_S * (1 + (boss.ease - 1) * 0.6));
        if (left <= 0) {
          loseLine(c);
          if (!ctx.playing) {
            return;
          }
        } else if (c.undo) {
          c.undo.style.setProperty("--left", left.toFixed(3));
        }
      }
      runAdmin(dt);
      if (boss.autoplay) {
        autoplayStep(dt);
      }
    }
    if (boss.typing) {
      boss.typing.at += dt * 26;
      const shown = Math.min(PUSH_COMMAND.length, Math.floor(boss.typing.at));
      boss.typing.node.textContent = PUSH_COMMAND.slice(0, shown) + (shown < PUSH_COMMAND.length ? "█" : "");
      if (shown >= PUSH_COMMAND.length) {
        boss.typing = null;
      }
    }
    if (sayPending && clock >= sayRead) {
      bossSay(sayPending[0], sayPending[1]);
    }
    if (!adminSay.hidden && clock > sayUntil) {
      adminSay.hidden = true;
    }
    movePointer(dt);
  }

  /** The pointer glides to the link he is after, measured a few times a second, not every frame. */
  function movePointer(dt) {
    if (pointer.hidden) {
      return;
    }
    boss.measureIn -= dt;
    if (boss.measureIn <= 0) {
      boss.measureIn = 0.2;
      const frame = win.getBoundingClientRect();
      const target = boss.targets[0] && boss.targets[0].link;
      if (target && target.isConnected) {
        const r = target.getBoundingClientRect();
        const b = body.getBoundingClientRect();
        boss.wantX = r.left - frame.left + Math.min(26, r.width * 0.3);
        boss.wantY = Math.max(b.top, Math.min(b.bottom - 30, r.top + r.height * 0.55)) - frame.top;
      } else if (boss.state === "push") {
        // At the terminal, typing, under what it answers
        boss.wantX = frame.width * 0.62;
        boss.wantY = body.getBoundingClientRect().top - frame.top + 128;
      } else {
        // Between two clicks, off the lines he just wiped: under the last conflict when
        // there is room (a wide screen), else up in the title bar
        const b = body.getBoundingClientRect();
        const last = boss.conflicts.length && boss.conflicts[boss.conflicts.length - 1].node;
        const below = last && last.isConnected ? last.getBoundingClientRect().bottom + 14 : b.bottom;
        boss.wantX = frame.width * 0.45;
        boss.wantY = (below + 64 < b.bottom ? below : frame.top - 6) - frame.top;
      }
    }
    const ease = boss.placed ? Math.min(1, dt * 9) : 1;
    boss.placed = true;
    boss.x += (boss.wantX - boss.x) * ease;
    boss.y += (boss.wantY - boss.y) * ease;
    pointer.style.transform = "translate(" + boss.x.toFixed(1) + "px, " + boss.y.toFixed(1) + "px)";
  }

  /** The admin in 3D: walks in, clicks with his arm, flinches when caught, slumps at the end. */
  const adminHead = new THREE.Vector3();
  const toCamera = new THREE.Vector3();
  function animateAdmin(dt) {
    if (!boss.on) {
      return;
    }
    const g = admin.group;
    boss.walk = Math.min(1, boss.walk + dt / 1.3);
    boss.click = Math.max(0, boss.click - dt * 3);
    boss.flinch = Math.max(0, boss.flinch - dt * 2.5);
    if (boss.state === "beaten") {
      boss.slump = Math.min(1, boss.slump + dt * 1.6);
      boss.leave += dt;
    }
    const walking = boss.walk < 1 || boss.leave > 2.6;
    const out = Math.max(0, boss.leave - 2.6) * 2.4;
    const k = 1 - Math.pow(1 - boss.walk, 3);
    g.position.x = ADMIN_FROM + (ADMIN_AT.x - ADMIN_FROM) * k + out;
    g.position.z = ADMIN_AT.z;
    g.position.y = walking ? Math.abs(Math.sin(clock * 9)) * 0.06 : 0;
    // Turned to the desk while he works, away when he leaves
    g.rotation.y = boss.leave > 2.6 ? 1.6 : -0.35 + boss.slump * 0.25;
    admin.legs[0].rotation.x = walking ? Math.sin(clock * 9) * 0.5 : 0;
    admin.legs[1].rotation.x = walking ? -Math.sin(clock * 9) * 0.5 : 0;
    admin.torso.rotation.x = boss.slump * 0.35 - boss.flinch * 0.15;
    admin.torso.rotation.z = boss.flinch * Math.sin(clock * 30) * 0.08;
    // The desk-side arm: raised while he hovers a link, down hard when he clicks
    const reach = boss.ai === "windup" || boss.ai === "move" ? 1 : 0;
    const arm = admin.arms[0];
    arm.rotation.x += ((-1.1 * reach - boss.click * 0.5 + boss.slump * 0.2) - arm.rotation.x) * Math.min(1, dt * 8);
    arm.rotation.z = -0.25 * reach;
    admin.arms[1].rotation.z = 0.15 + (boss.state === "push" ? Math.sin(clock * 6) * 0.4 : 0);
    // His face looks at the camera, just in front of his head
    g.updateMatrixWorld();
    adminHead.set(0, 1.78 - boss.slump * 0.12, 0).applyMatrix4(g.matrixWorld);
    toCamera.copy(camera.position).sub(adminHead).normalize().multiplyScalar(0.32);
    admin.face.position.copy(adminHead).add(toCamera);
    admin.face.quaternion.copy(camera.quaternion);
    admin.face.scale.setScalar(1 + boss.flinch * 0.12);
    admin.sign.position.set(adminHead.x, adminHead.y + 0.55, adminHead.z);
    const visible = g.position.x < ADMIN_FROM + 1;
    g.visible = visible;
    admin.face.visible = visible;
    admin.sign.visible = visible && boss.state !== "beaten";
  }

  /* ---------- Camera ---------- */

  const focus = new THREE.Vector3();
  const eye = new THREE.Vector3();
  const wantedFocus = new THREE.Vector3();
  const wantedEye = new THREE.Vector3();
  let cameraReady = false;
  function placeCamera(idle, time, dt) {
    // setViewOffset sets the aspect from its own sizes: it is given the real
    // one every frame, so the engine's portrait test stays right
    const canvas = ctx.engine.renderer.domElement;
    const aspect =
      canvas.clientWidth && canvas.clientHeight
        ? canvas.clientWidth / canvas.clientHeight
        : camera.aspect;
    camera.aspect = aspect;
    const portrait = aspect < 1;
    if (idle) {
      camera.clearViewOffset();
      const a = Math.sin(time * 0.25) * 0.35;
      camera.fov = portrait ? 66 : 52;
      camera.position.set(
        -1.2 + Math.sin(a + 0.5) * 5.5,
        portrait ? 3.2 : 2.7,
        -0.9 + Math.cos(a + 0.5) * 5.5,
      );
      focus.set(-1.2, 0.9, -0.9);
      cameraReady = false;
    } else {
      camera.fov = portrait ? 60 : 50;
      // The editor covers the left of a wide screen and the top of a tall
      // one is free: the picture is shifted so the desk stays in what is left.
      // It follows the guinea pig when it goes over to Mariia's desk.
      if (portrait) {
        // At the boss the editor rises: the picture rises with it
        camera.setViewOffset(100 * aspect, 100, 0, boss.on ? 33 : 25, 100 * aspect, 100);
      } else {
        camera.setViewOffset(
          100 * aspect,
          100,
          -30 * aspect,
          0,
          100 * aspect,
          100,
        );
      }
      // At the boss the picture takes the admin in too, standing by the desk
      const side = boss.on && boss.leave < 2.6 ? 1 : 0;
      if (portrait) {
        wantedFocus.set(pig.object.position.x * 0.9 - 0.1 + side * 0.7, 0.75 + side * 0.25, -0.6);
      } else {
        wantedFocus.set(pig.object.position.x * 0.8 - 0.1 + side * 0.45, 0.85 + side * 0.2, -0.9);
      }
      const offset = portrait ? CAMERA_TALL : CAMERA_WIDE;
      wantedEye.set(
        wantedFocus.x + offset.x,
        wantedFocus.y + offset.y,
        wantedFocus.z + offset.z,
      );
      const ease = cameraReady ? Math.min(1, dt * 3) : 1;
      focus.lerp(wantedFocus, ease);
      eye.lerp(wantedEye, ease);
      cameraReady = true;
      camera.position.copy(eye);
      if (shake > 0) {
        shake = Math.max(0, shake - dt);
        camera.position.x += (Math.random() - 0.5) * shake * 0.4;
        camera.position.y += (Math.random() - 0.5) * shake * 0.4;
      }
    }
    camera.updateProjectionMatrix();
    camera.lookAt(focus);
    ctx.engine.aimSun(focus.x, focus.z);
  }

  function animatePig(dt) {
    animateItems(dt);
    const state = {
      running: false,
      airborne: false,
      ducking: false,
      speed: 0,
      height: 0,
    };
    hop = Math.max(0, hop - dt);
    const lift = hop > 0 ? Math.sin((hop / 0.4) * Math.PI) * 0.16 : 0;
    pig.object.position.y = lift;
    state.height = lift;
    if (wobble > 0) {
      wobble = Math.max(0, wobble - dt * 1.5);
      pig.hitWobble(wobble);
    }
    // Mariia turns to the guinea pig and nods while she talks
    talking = Math.max(0, talking - dt);
    herTurn += ((talking > 0 ? 1.2 : 0) - herTurn) * Math.min(1, dt * 4);
    mariia.rotation.y = herTurn;
    clockHead += dt;
    head.rotation.x =
      talking > 0
        ? Math.sin(clockHead * 9) * 0.12
        : Math.sin(clockHead * 1.5) * 0.03;
    pig.shadow.position.set(
      pig.object.position.x,
      0.012,
      pig.object.position.z + 0.05,
    );
    pig.state = state;
    animateAdmin(dt);
  }

  // Ready for the intro card
  render();
  cursorOn(1);
  placeCamera(true, 0);

  return {
    start() {
      // guinea-at=N in the page URL starts at round N, for checks, and 4 at the admin.
      // A player out of hearts at the admin starts the next try at him.
      const at = Math.floor(ctx.params.startAt) || 0;
      const retry = !at && bossRetryAt > 0 && Date.now() - bossRetryAt < BOSS_RETRY_MS;
      if (at >= 4 || retry) {
        bossRetryAt = 0;
        startBoss(retry);
        if (retry) {
          hud.toast(t("retryBoss"), "power");
        }
        return;
      }
      const first = Math.min(3, Math.max(1, at || 1));
      startRound(first);
      if (first === 1) {
        hud.chat("mariia", t("c_r1"), 6000);
      }
    },
    update(dt, time) {
      clock += dt;
      if (!busy) {
        roundTime += dt;
      }
      // The time bonus bar of a round; the boss has his life bar instead
      if (round <= ROUND_SECONDS.length) {
        const left = Math.max(0, 1 - roundTime / ROUND_SECONDS[round - 1]);
        timerFill.style.transform = "scaleX(" + left.toFixed(3) + ")";
        timer.classList.toggle("is-low", left < 0.25);
      }
      for (let i = timers.length - 1; i >= 0; i--) {
        if (timers[i].at <= clock) {
          const fn = timers[i].fn;
          timers.splice(i, 1);
          if (ctx.playing) {
            fn();
          }
        }
      }
      updateBoss(dt);
      animatePig(dt);
      placeCamera(false, time, dt);
    },
    action(name) {
      if (busy || !ctx.playing || !rows.length) {
        return;
      }
      if (name === "jump" || name === "duck") {
        const delta = name === "jump" ? -1 : 1;
        if (round === 3 && r3.grabbed) {
          moveCard(r3.grabbed, delta);
          return;
        }
        cursor.row += delta;
        cursor.col = Math.min(cursor.col, 0);
        if (round === 4) {
          clampCursor();
          cursor.col = bossColumn(cursor.row);
        }
        ctx.sound.play("click");
      } else if (name === "left" || name === "right") {
        cursor.col += name === "left" ? -1 : 1;
        ctx.sound.play("click");
      } else if (name === "confirm") {
        const node = rows[cursor.row] && rows[cursor.row][cursor.col];
        if (node && node.__press) {
          node.__press();
        }
        return;
      } else {
        return;
      }
      clampCursor();
      paintCursor();
    },
    idleCamera(time) {
      animatePig(0);
      placeCamera(true, time);
    },
    dispose() {
      if (dragCleanup) {
        dragCleanup();
      }
      camera.clearViewOffset();
      camera.fov = 60;
      camera.updateProjectionMatrix();
      pig.hitWobble(0);
      win.remove();
      admin.gone = true;
      bossBar.remove();
      adminSay.remove();
      if (window.__guineaRun && window.__guineaRun.w5) {
        delete window.__guineaRun.w5;
      }
      ctx.setData("pace", "");
      ctx.setData("boss", "");
      for (const thing of disposables) {
        thing.dispose();
      }
    },
  };
}

/**
 * A line of XML, with half its indentation, as a hanging indent, and break
 * points after the dots and before closing tags: a long API name wraps on a
 * phone at a place that still reads, and never scrolls sideways.
 */
function codeText(parent, text) {
  const indent = text.length - text.trimStart().length;
  const node = el(
    "span",
    "gr-w5-tx",
    parent,
    text
      .trimStart()
      .replace(/\./g, ".​")
      .replace(/(.)<\//g, "$1​</"),
  );
  node.style.paddingLeft = indent / 2 + 2 + "ch";
  node.style.textIndent = "-2ch";
  return node;
}

function el(tag, className, parent, text) {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (text !== undefined && text !== null) {
    node.textContent = text;
  }
  if (parent) {
    parent.appendChild(node);
  }
  return node;
}

/** One glyph and a word or two, big enough to read on the monitor. */
function drawBig(c, w, h, color, icon, word) {
  c.fillStyle = "#1F1F1F";
  c.fillRect(0, 0, w, h);
  c.fillStyle = color;
  rounded(c, 22, 22, w - 44, h - 44, 30);
  c.fill();
  c.beginPath();
  c.arc(w / 2, h * 0.38, 62, 0, Math.PI * 2);
  c.fillStyle = "rgba(255, 255, 255, 0.25)";
  c.fill();
  glyph(c, icon, w / 2, h * 0.38, 110, SLDS.white);
  c.fillStyle = SLDS.white;
  c.textAlign = "center";
  c.textBaseline = "middle";
  fitText(c, word, w / 2, h * 0.76, w - 90, 72, "800");
}

/** The guinea pig's monitor: where the merge stands, in one glyph and a word. */
function drawScreen(c, w, h, kind, t) {
  if (kind === "permset" || kind === "pageconflict") {
    drawBig(c, w, h, SLDS.error, "warning", t("screenConflict"));
  } else if (kind === "ok") {
    drawBig(c, w, h, SLDS.success, "check", t("screenMerged"));
  } else if (kind === "bad") {
    drawBig(c, w, h, SLDS.errorDark, "error", t("screenBad"));
  } else if (kind === "dup") {
    drawBig(c, w, h, SLDS.warningDark, "warning", t("screenDup"));
  } else if (kind === "released") {
    drawBig(c, w, h, SLDS.success, "star", t("screenReleased"));
  } else if (kind === "protected") {
    drawBig(c, w, h, SLDS.teal, "lock", t("screenProtected"));
  } else {
    drawBig(c, w, h, SLDS.navy, "branch", "3 PR");
  }
}

/** The admin's portrait in a white ring, on the canvas of his 3D face. */
function drawPortrait(c, image, size) {
  const half = size / 2;
  c.clearRect(0, 0, size, size);
  c.save();
  c.fillStyle = "#ffffff";
  c.beginPath();
  c.arc(half, half, half - 1, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.arc(half, half, half * 0.9, 0, Math.PI * 2);
  c.clip();
  c.drawImage(image, half * 0.1, half * 0.1, size * 0.9, size * 0.9);
  c.restore();
}

/** A plain, grumpy face while the portrait loads, or for good if it never does. */
function drawStandInFace(c, size, seed) {
  const half = size / 2;
  const tones = ["#f1c8a8", "#d9a07a", "#b57a55", "#8d5a3b"];
  const hair = ["#2a2a2a", "#6b3a1e", "#c98e4a", "#8a8a8a"];
  c.clearRect(0, 0, size, size);
  c.fillStyle = "#ffffff";
  c.beginPath();
  c.arc(half, half, half - 1, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#ffe3ec";
  c.beginPath();
  c.arc(half, half, half * 0.9, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = tones[seed % tones.length];
  c.beginPath();
  c.ellipse(half, half * 1.02, half * 0.5, half * 0.6, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = hair[seed % hair.length];
  c.beginPath();
  c.ellipse(half, half * 0.62, half * 0.52, half * 0.28, 0, Math.PI, Math.PI * 2);
  c.fill();
  c.fillStyle = "#1a1a2e";
  for (const x of [0.8, 1.2]) {
    c.beginPath();
    c.arc(half * x, half * 0.98, half * 0.06, 0, Math.PI * 2);
    c.fill();
  }
  // Frowning: he is in a hurry
  c.strokeStyle = "#1a1a2e";
  c.lineWidth = size * 0.025;
  c.lineCap = "round";
  c.beginPath();
  c.arc(half, half * 1.42, half * 0.16, Math.PI * 1.15, Math.PI * 1.85);
  c.stroke();
}

export const CSS = `
/* On a wide screen the editor fills the left: the "Why?" box sits on the right, off its buttons */
@media (min-width: 761px) {
  .guinea-run:has(.gr-w5) .gr-tipbar {
    left: calc(min(60vw, 860px) + 24px + (100% - min(60vw, 860px) - 36px) / 2);
    max-width: calc(100% - min(60vw, 860px) - 48px);
  }
}

.guinea-run .gr-w5 {
  position: absolute;
  top: calc(env(safe-area-inset-top, 0px) + 104px);
  left: calc(env(safe-area-inset-left, 0px) + 12px);
  bottom: calc(env(safe-area-inset-bottom, 0px) + 12px);
  display: flex;
  flex-direction: column;
  width: min(60vw, 860px);
  overflow: hidden;
  border: 1px solid #c9c9c9;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 6px 24px rgba(3, 45, 96, 0.3);
  color: #181818;
  font-size: 13px;
  line-height: 1.4;
}
.guinea-run.gr-show-buttons .gr-w5 {
  bottom: calc(env(safe-area-inset-bottom, 0px) + 88px);
}
.guinea-run .gr-w5-titlebar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  border-bottom: 1px solid #e5e5e5;
  background: #f3f3f3;
}
.guinea-run .gr-w5-dots {
  color: #c9c9c9;
  font-size: 10px;
  letter-spacing: -1px;
}
.guinea-run .gr-w5-file {
  font-variant-ligatures: none;
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 12px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.guinea-run .gr-w5-roundpill {
  flex: 0 0 auto;
  padding: 2px 10px;
  border-radius: 999px;
  background: #032d60;
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
}
.guinea-run .gr-w5-timer {
  height: 5px;
  background: #e5e5e5;
}
.guinea-run .gr-w5-timer i {
  display: block;
  height: 100%;
  background: #0176d3;
  transform-origin: left center;
  transition: background 0.3s;
}
.guinea-run .gr-w5-timer.is-low i {
  background: #fe9339;
}
.guinea-run .gr-w5-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-bottom: 1px solid #e5e5e5;
}
.guinea-run .gr-w5-task {
  flex: 1 1 260px;
  margin: 0;
  color: #444444;
  font-size: 13px;
}
.guinea-run .gr-w5-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 8px;
  background: #fafafa;
  overscroll-behavior: contain;
  transition: opacity 0.3s;
}
.guinea-run .gr-w5.is-busy .gr-w5-body {
  opacity: 0.75;
}
.guinea-run .gr-w5-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 8px;
}
.guinea-run .gr-w5-pane {
  min-width: 0;
  border: 1px solid #d8dde6;
  border-radius: 4px;
  background: #ffffff;
}
.guinea-run .gr-w5-pane--res {
  grid-column: 1 / -1;
}
.guinea-run .gr-w5-pane header {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
  padding: 4px 8px;
  border-bottom: 1px solid #e5e5e5;
  border-left: 4px solid #706e6b;
  font-size: 12px;
}
.guinea-run .gr-w5-pane--in header {
  border-left-color: #0176d3;
}
.guinea-run .gr-w5-pane--cur header {
  border-left-color: #2e844a;
}
.guinea-run .gr-w5-pane header code {
  overflow: hidden;
  color: #706e6b;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.guinea-run .gr-w5-code {
  padding: 4px 0;
  font-variant-ligatures: none;
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 12px;
  line-height: 1.55;
}
.guinea-run .gr-w5-line {
  display: flex;
  width: 100%;
  min-height: 0;
  margin: 0;
  padding: 0 6px 0 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: #181818;
  font: inherit;
  text-align: left;
}
.guinea-run .gr-w5-ln {
  flex: 0 0 26px;
  padding-right: 6px;
  color: #a0a0a0;
  text-align: right;
  user-select: none;
}
.guinea-run .gr-w5-tx {
  flex: 1 1 auto;
  min-width: 0;
  white-space: pre-wrap;
  overflow-wrap: break-word;
}
.guinea-run .gr-w5-line.is-in {
  background: #dcecfc;
}
.guinea-run .gr-w5-line.is-cur {
  background: #dff3e4;
}
.guinea-run .gr-w5-line.is-marker {
  background: #fde7e9;
  color: #ba0517;
  font-weight: 700;
}
.guinea-run .gr-w5-line.is-add {
  background: #fff1dc;
}
.guinea-run .gr-w5-btn.gr-w5-noteline {
  min-height: 0;
  padding: 0 6px 0 0;
  border: 0;
  font-size: 12px;
  font-family: 'JetBrains Mono', Consolas, monospace;
  color: #8a8a8a;
  font-style: italic;
  font-weight: 400;
  cursor: pointer;
}
.guinea-run .gr-w5-btn.gr-w5-noteline:hover {
  background: #fff8c5;
  color: #444444;
}
.guinea-run .gr-w5-lens {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 2px 6px 2px 32px;
}
.guinea-run .gr-w5-lens:empty {
  display: none;
}
.guinea-run .gr-w5-lens--result {
  padding-top: 6px;
}
.guinea-run .gr-w5-btn {
  min-height: 34px;
  padding: 4px 12px;
  font-size: 13px;
  font-family: 'Open Sans', 'Segoe UI', Arial, sans-serif;
}
.guinea-run .gr-w5-lensbtn {
  min-height: 30px;
  padding: 2px 10px;
  font-size: 12px;
}
.guinea-run .gr-w5-btn.is-next {
  border-color: #ff9a00;
  animation: gr-w5-glow 1.1s ease-in-out infinite;
}
@keyframes gr-w5-glow {
  50% {
    box-shadow: 0 0 0 5px rgba(255, 180, 0, 0.55);
    transform: scale(1.04);
  }
}
.guinea-run .gr-w5-primary {
  border-color: #0176d3;
  background: #0176d3;
  color: #ffffff;
}
.guinea-run .gr-w5-primary:hover {
  background: #014486;
}
.guinea-run .gr-w5-done {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  color: #2e844a;
  font-family: 'Open Sans', 'Segoe UI', Arial, sans-serif;
  font-size: 12px;
  font-weight: 700;
}
.guinea-run .gr-w5-done::before {
  content: "\\2713";
  margin-right: 5px;
}
.guinea-run .gr-w5 .is-cursor {
  outline: 3px solid #fe9339;
  outline-offset: 1px;
  box-shadow: 0 0 0 5px rgba(254, 147, 57, 0.25);
}
.guinea-run .gr-w5-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border-top: 1px solid #e5e5e5;
  background: #ffffff;
}
.guinea-run .gr-w5-hint {
  color: #706e6b;
  font-size: 12px;
}
.guinea-run .gr-w5-footer-buttons {
  display: flex;
  gap: 8px;
  margin-left: auto;
}
.guinea-run .gr-w5-stamp {
  position: absolute;
  top: 45%;
  left: 50%;
  z-index: 3;
  padding: 12px 22px;
  border: 3px solid #ffffff;
  border-radius: 12px;
  background: #2e844a;
  box-shadow: 0 8px 30px rgba(3, 45, 96, 0.35);
  color: #ffffff;
  font-size: 22px;
  font-weight: 800;
  text-align: center;
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, -50%) scale(0.4) rotate(-8deg);
}
.guinea-run .gr-w5-stamp.is-shown {
  animation: gr-w5-stamp 0.45s cubic-bezier(0.2, 1.6, 0.4, 1) forwards;
}
.guinea-run .gr-w5-stamp::before {
  content: "\\2713  ";
}
.guinea-run .gr-w5-prs {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.guinea-run .gr-w5-pritem {
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
}
.guinea-run .gr-w5-pritem.is-dragging .gr-w5-pr {
  box-shadow: 0 8px 20px rgba(3, 45, 96, 0.3);
  transform: scale(1.02);
}
.guinea-run .gr-w5-slot {
  color: #032d60;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
}
.guinea-run .gr-w5-slot.is-back {
  color: #ba0517;
}
.guinea-run .gr-w5-pr {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 3px;
  min-width: 0;
  padding: 8px 10px;
  color: #181818;
  font-weight: 400;
  text-align: left;
  cursor: grab;
  touch-action: none;
  user-select: none;
}
.guinea-run .gr-w5-pr.is-grabbed {
  border-color: #fe9339;
  background: #fff6ee;
  transform: scale(1.02);
}
.guinea-run .gr-w5-pr.is-merged {
  border-color: #2e844a;
  background: #eef8f0;
}
.guinea-run .gr-w5-pr.is-back {
  border-color: #ba0517;
  background: #fdf0f1;
}
.guinea-run .gr-w5-prhead {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.guinea-run .gr-w5-prnum {
  color: #706e6b;
  font-weight: 700;
}
.guinea-run .gr-w5-prmeta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  color: #444444;
  font-size: 12px;
}
.guinea-run .gr-w5-prtouch {
  color: #706e6b;
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 12px;
  overflow-wrap: anywhere;
}
.guinea-run .gr-w5-check {
  font-weight: 700;
}
.guinea-run .gr-w5-check::before {
  content: "\\25CF  ";
}
.guinea-run .gr-w5-check.is-ok {
  color: #2e844a;
}
.guinea-run .gr-w5-check.is-ko {
  color: #ba0517;
}
.guinea-run .gr-w5-prstate {
  align-self: flex-start;
  padding: 1px 8px;
  border-radius: 999px;
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
}
.guinea-run .gr-w5-prstate.is-merged {
  background: #8250df;
}
.guinea-run .gr-w5-prstate.is-back {
  background: #ba0517;
}
.guinea-run .gr-w5-arrows {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.guinea-run .gr-w5-move {
  min-width: 44px;
  min-height: 34px;
  padding: 0;
  font-size: 14px;
}
@keyframes gr-w5-stamp {
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1) rotate(-4deg);
  }
}

/* ---------- The boss: a file with its conflicts, VS Code's links over each one ---------- */
/* His life bar takes a line under the top bar: the editor starts under the goal */
.guinea-run .gr-w5.is-boss {
  top: calc(env(safe-area-inset-top, 0px) + 140px);
}
.guinea-run .gr-w5.is-boss .gr-w5-timer {
  display: none;
}
.guinea-run.gr-show-buttons .gr-w5.is-boss {
  bottom: calc(env(safe-area-inset-bottom, 0px) + 12px);
}
.guinea-run .gr-w5-cfs {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.guinea-run .gr-w5-cf {
  position: relative;
  overflow: hidden;
  border: 1px solid #d8dde6;
  border-radius: 4px;
  background: #ffffff;
  font-variant-ligatures: none;
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 12px;
  line-height: 1.45;
  transition: box-shadow 0.2s, border-color 0.2s;
}
.guinea-run .gr-w5-cf.is-targeted {
  border-color: #ea001e;
  box-shadow: 0 0 0 3px rgba(234, 0, 30, 0.25);
}
.guinea-run .gr-w5-cf.is-wiped {
  border-color: #dd7a01;
  box-shadow: 0 0 0 3px rgba(254, 147, 57, 0.4);
}
.guinea-run .gr-w5-cf.is-kept {
  border-color: #2e844a;
  animation: gr-w5-kept 0.45s ease-out;
}
.guinea-run .gr-w5-cf-lens {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  padding: 2px 4px;
  border-bottom: 1px solid #eeeeee;
  background: #fafafa;
}
.guinea-run .gr-w5-btn.gr-w5-link {
  min-height: 26px;
  padding: 2px 7px;
  border: 0;
  border-radius: 3px;
  background: transparent;
  box-shadow: none;
  color: #0176d3;
  font-size: 12px;
  font-weight: 600;
}
.guinea-run .gr-w5-btn.gr-w5-link:hover {
  background: #eef4ff;
  text-decoration: underline;
}
.guinea-run .gr-w5-btn.gr-w5-link.is-both {
  color: #2e844a;
  font-weight: 800;
}
.guinea-run .gr-w5-cf.is-targeted .gr-w5-btn.gr-w5-link.is-current {
  background: #fde7e9;
  color: #ba0517;
  animation: gr-w5-hover 0.45s ease-in-out infinite alternate;
}
.guinea-run .gr-w5-cf-mark {
  padding: 0 8px;
  color: #706e6b;
  font-size: 11px;
  line-height: 16px;
}
.guinea-run .gr-w5-cf-mark.is-cur {
  background: #b9e6c6;
  color: #1c4f2c;
}
.guinea-run .gr-w5-cf-mark.is-in {
  background: #c2dbf7;
  color: #023570;
}
.guinea-run .gr-w5-cf-line {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 22px;
  padding: 1px 8px;
}
.guinea-run .gr-w5-cf-line.is-cur {
  background: #e3f5e8;
}
.guinea-run .gr-w5-cf-line.is-in {
  background: #e6f0fc;
}
.guinea-run .gr-w5-cf-tag {
  flex: 0 0 auto;
  color: #8a8a8a;
}
.guinea-run .gr-w5-cf-line b {
  min-width: 0;
  color: #181818;
  overflow-wrap: anywhere;
}
.guinea-run .gr-w5-cf-fold {
  flex: 0 0 auto;
  padding: 0 3px;
  border: 1px solid #c9c9c9;
  border-radius: 3px;
  color: #8a8a8a;
  font-size: 10px;
  line-height: 12px;
}
.guinea-run .gr-w5-cf-who {
  flex: 0 0 auto;
  margin-left: auto;
  padding: 0 7px;
  border-radius: 999px;
  background: #2e844a;
  color: #ffffff;
  font-family: 'Open Sans', 'Segoe UI', Arial, sans-serif;
  font-size: 11px;
  font-weight: 700;
  line-height: 17px;
}
.guinea-run .gr-w5-cf-line.is-in .gr-w5-cf-who {
  background: #9050e9;
}
.guinea-run .gr-w5-cf-line.is-struck,
.guinea-run .gr-w5-cf-line.is-gone {
  background: #fde7e9;
}
.guinea-run .gr-w5-cf-line.is-struck b,
.guinea-run .gr-w5-cf-line.is-struck .gr-w5-cf-tag,
.guinea-run .gr-w5-cf-line.is-gone b,
.guinea-run .gr-w5-cf-line.is-gone .gr-w5-cf-tag {
  color: #ba0517;
  text-decoration: line-through;
}
.guinea-run .gr-w5-cf-line.is-struck {
  animation: gr-w5-wiped 0.35s ease-out;
}
.guinea-run .gr-w5-cf-line.is-gone {
  opacity: 0.45;
}
.guinea-run .gr-w5-cf-undo {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  padding: 4px 6px;
  background: #fff4e5;
}
.guinea-run .gr-w5-btn.gr-w5-undo {
  --left: 1;
  min-height: 32px;
  padding: 2px 18px;
  border: 2px solid #dd7a01;
  background: linear-gradient(90deg, #ffc46b calc(var(--left) * 100%), #ffffff 0);
  color: #6b3a00;
  font-weight: 800;
}
.guinea-run .gr-w5-cf-what {
  color: #ba0517;
  font-family: 'Open Sans', 'Segoe UI', Arial, sans-serif;
  font-size: 12px;
  font-weight: 700;
}
.guinea-run .gr-w5-cf-marktag {
  display: none;
  float: right;
  color: #1c4f2c;
}
.guinea-run .gr-w5-done.gr-w5-cf-ok {
  display: flex;
  min-height: 0;
  padding: 1px 8px;
  background: #eef8f0;
}
.guinea-run .gr-w5-admin {
  --p: 0;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 4;
  width: 0;
  height: 0;
  pointer-events: none;
  transform: translate(-200px, -200px);
}
.guinea-run .gr-w5-admin[hidden] {
  display: none;
}
.guinea-run .gr-w5-admin svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 20px;
  height: 26px;
  fill: #ea001e;
  stroke: #ffffff;
  stroke-width: 1.6;
  stroke-linejoin: round;
  filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.35));
  transform-origin: 0 0;
}
.guinea-run .gr-w5-admin.is-click svg {
  animation: gr-w5-press 0.25s ease-out;
}
.guinea-run .gr-w5-admin-face,
.guinea-run .gr-w5-bossface,
.guinea-run .gr-w5-say-face {
  display: block;
  border-radius: 50%;
  background-color: #ffd8c2;
}
.guinea-run .gr-w5-admin-face img,
.guinea-run .gr-w5-bossface img,
.guinea-run .gr-w5-say-face img {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
}
.guinea-run .gr-w5-admin-face {
  position: absolute;
  top: 18px;
  left: 12px;
  width: 38px;
  height: 38px;
  padding: 3px;
  background: conic-gradient(#ea001e calc(var(--p) * 360deg), rgba(255, 255, 255, 0.95) 0);
  box-shadow: 0 2px 6px rgba(3, 45, 96, 0.35);
}
.guinea-run .gr-w5-admin.is-stunned .gr-w5-admin-face {
  animation: gr-w5-dizzy 0.5s ease-out;
}
.guinea-run .gr-w5-admin-tag {
  position: absolute;
  top: 28px;
  left: 52px;
  padding: 1px 7px;
  border-radius: 999px;
  background: #ea001e;
  color: #ffffff;
  font-family: 'Open Sans', 'Segoe UI', Arial, sans-serif;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
}
.guinea-run .gr-w5-say {
  position: absolute;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 150px);
  right: calc(env(safe-area-inset-right, 0px) + 14px);
  z-index: 3;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: min(380px, calc(100% - min(60vw, 860px) - 52px));
  padding: 8px 12px 8px 8px;
  border: 2px solid #ea001e;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 4px 0 rgba(186, 5, 23, 0.35), 0 8px 20px rgba(3, 45, 96, 0.25);
  color: #181818;
  font-size: 15px;
  line-height: 1.35;
  pointer-events: none;
}
.guinea-run .gr-w5-say[hidden] {
  display: none;
}
.guinea-run:not([data-state="playing"]) .gr-w5-say {
  visibility: hidden;
}
.guinea-run .gr-w5-say.is-new {
  animation: gr-w5-pop 0.35s cubic-bezier(0.2, 1.6, 0.4, 1);
}
.guinea-run .gr-w5-say-face {
  flex: 0 0 44px;
  width: 44px;
  height: 44px;
}
.guinea-run .gr-w5-say strong {
  display: block;
  color: #ba0517;
  font-size: 13px;
}
.guinea-run .gr-w5-bossbar {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 320px;
  max-width: 520px;
  padding: 3px 12px 3px 3px;
  border: 2px solid #ffffff;
  border-radius: 999px;
  background: rgba(3, 45, 96, 0.92);
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.3);
  color: #ffffff;
  font-size: 14px;
  pointer-events: none;
}
.guinea-run .gr-w5-bossbar[hidden] {
  display: none;
}
.guinea-run .gr-w5-bossface {
  flex: 0 0 30px;
  width: 30px;
  height: 30px;
  border: 2px solid #ffffff;
}
.guinea-run .gr-w5-bossbar strong {
  white-space: nowrap;
}
.guinea-run .gr-w5-bossbar i {
  flex: 1 1 auto;
  display: block;
  min-width: 80px;
  height: 12px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.22);
}
.guinea-run .gr-w5-bossbar b {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #ff5d2d, #ea001e);
  transition: width 0.25s;
}
.guinea-run .gr-w5-bossbar.is-low b {
  animation: gr-w5-blink 0.5s infinite;
}
.guinea-run .gr-w5-bossbar.is-down {
  opacity: 0.65;
}
.guinea-run .gr-w5-term {
  min-height: 150px;
  padding: 10px 12px;
  border-radius: 4px;
  background: #1e1e1e;
  color: #d4d4d4;
  font-variant-ligatures: none;
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 12px;
  line-height: 1.55;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.guinea-run .gr-w5-term-cmd {
  color: #ffffff;
  font-weight: 700;
}
.guinea-run .gr-w5-term-err {
  color: #f48771;
  animation: gr-w5-line 0.2s ease-out;
}
.guinea-run .gr-w5-stamp.is-protected {
  max-width: 86%;
  background: #032d60;
}
.guinea-run .gr-w5-stamp.is-protected::before {
  content: none;
}
@keyframes gr-w5-hover {
  to {
    background: #f9c6cc;
    transform: scale(1.06);
  }
}
@keyframes gr-w5-press {
  50% {
    transform: scale(0.75);
  }
}
@keyframes gr-w5-dizzy {
  30% {
    transform: rotate(-25deg) scale(1.15);
  }
  70% {
    transform: rotate(20deg);
  }
}
@keyframes gr-w5-pop {
  from {
    opacity: 0;
    transform: scale(0.6);
  }
}
@keyframes gr-w5-blink {
  50% {
    opacity: 0.45;
  }
}
@keyframes gr-w5-kept {
  from {
    box-shadow: 0 0 0 8px rgba(46, 132, 74, 0.45);
  }
}
@keyframes gr-w5-wiped {
  from {
    transform: translateX(-12px);
    opacity: 0.3;
  }
}
@keyframes gr-w5-line {
  from {
    opacity: 0;
  }
}
@media (pointer: coarse) {
  .guinea-run .gr-w5-btn,
  .guinea-run .gr-w5-lensbtn {
    min-height: 44px;
  }
  .guinea-run .gr-w5-move {
    min-height: 44px;
  }
}
@media (max-aspect-ratio: 1/1) {
  .guinea-run .gr-w5 {
    top: 42vh;
    top: 42dvh;
    right: calc(env(safe-area-inset-right, 0px) + 8px);
    left: calc(env(safe-area-inset-left, 0px) + 8px);
    width: auto;
  }
  .guinea-run .gr-w5-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .guinea-run .gr-w5-pane--res {
    grid-column: auto;
  }
  .guinea-run .gr-w5-pritem {
    grid-template-columns: minmax(0, 1fr) auto;
  }
  .guinea-run .gr-w5-slot {
    grid-column: 1 / -1;
  }
  .guinea-run .gr-w5-task {
    display: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .guinea-run .gr-w5-stamp.is-shown {
    animation-duration: 0.01s;
  }
  .guinea-run .gr-w5-cf.is-targeted .gr-w5-btn.gr-w5-link.is-current,
  .guinea-run .gr-w5-bossbar.is-low b,
  .guinea-run .gr-w5-say.is-new,
  .guinea-run .gr-w5-admin.is-stunned .gr-w5-admin-face {
    animation: none;
  }
}
/* The boss on a touch screen: the three links are buttons a thumb can hit */
@media (pointer: coarse) {
  .guinea-run .gr-w5-cf-lens {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 4px;
    padding: 4px;
  }
  .guinea-run .gr-w5-btn.gr-w5-link {
    min-height: 44px;
    padding: 2px 4px;
    border: 1px solid #c9c9c9;
    background: #ffffff;
    line-height: 1.2;
    white-space: normal;
  }
  .guinea-run .gr-w5-btn.gr-w5-link.is-both {
    border-color: #2e844a;
    background: #eef8f0;
  }
  .guinea-run .gr-w5-btn.gr-w5-undo {
    min-height: 44px;
  }
}
@media (max-aspect-ratio: 1/1) {
  /* The boss on a tall screen: the editor goes up, so the three conflicts of a file fit */
  .guinea-run .gr-w5.is-boss {
    top: 34vh;
    top: 34dvh;
  }
  .guinea-run .gr-w5.is-boss .gr-w5-toolbar,
  .guinea-run .gr-w5.is-boss .gr-w5-hint {
    display: none;
  }
  .guinea-run .gr-w5.is-boss .gr-w5-footer {
    padding: 6px 8px;
  }
  .guinea-run .gr-w5.is-boss .gr-w5-body {
    padding: 6px;
  }
  .guinea-run .gr-w5-cfs {
    gap: 6px;
  }
  .guinea-run .gr-w5-cf-tag,
  .guinea-run .gr-w5-cf-fold {
    display: none;
  }
  .guinea-run .gr-w5-cf-marktag {
    display: inline;
  }
  .guinea-run .gr-w5-cf-line {
    min-height: 20px;
  }
  .guinea-run .gr-w5-cf-lens {
    padding: 3px;
  }
  .guinea-run .gr-w5-stamp.is-protected {
    top: 74%;
    font-size: 18px;
  }
  .guinea-run .gr-w5-say {
    bottom: calc(66vh + 8px);
    bottom: calc(66dvh + 8px);
    left: calc(env(safe-area-inset-left, 0px) + 10px);
    right: calc(env(safe-area-inset-right, 0px) + 10px);
    width: auto;
    font-size: 14px;
  }
  .guinea-run .gr-w5-cf-mark {
    font-size: 10px;
    line-height: 14px;
  }
}
@media (max-width: 600px) {
  .guinea-run .gr-w5-bossbar {
    min-width: 0;
  }
}
`;
