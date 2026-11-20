/*
 * World 0, Get set up: a runner where the guinea pig collects what every
 * sfdx-hardis project needs on a machine, until every card of the Setup panel
 * of the VS Code extension is green. No org, no repository, no scratch org yet.
 *
 * The running gag of a first install: a tool you just installed stays "installed, not
 * found" in the Setup panel until VS Code is closed completely and opened
 * again, because VS Code only reads the PATH at startup. The gates at the end
 * of the first two sections are that restart, as a quiz; the last gate is
 * Re-check, which turns the last cards green.
 *
 * A missed install comes back down the track as a pending install, and what
 * is still missing at the end costs points, never the end of the world.
 * Vegetables (what guinea pigs like best) are bonus points all along.
 *
 * The goal line always says what is next (the tools of the section, the
 * restart that is owed, the green door), and the coach teaches each new
 * thing the first time it comes.
 *
 * The boss, past the Re-check door: the "Why install anything?" admin rolls
 * up the track on his office chair, his laptop held up open on Setup, and the
 * track holds while he fights (runner.hold). He throws blocks across the
 * lanes: "Access denied" walls (change lane), "Version from 2019" low blocks
 * (jump), "No admin rights" bars (duck), each warned by a stripe in the colour
 * of its move, one lane at first, three at the end. The tools he never
 * installed fall on the free lanes: each one the guinea pig catches flies to
 * his laptop and takes a bite of his excuses. Out of excuses, he installs VS
 * Code himself. He wears one of the twenty-one admin portraits, a different one
 * at each play (core/faces.js); guinea-at=860 opens him, and a player out of
 * hearts at him tries again from him.
 */
import { createRunner, RUNNER_TEXTS, RUNNER_CSS } from "./runner.js";
import { SLDS, rounded, fitText, glyph } from "../core/painter.js";
import { shuffled } from "../core/random.js";
import { pickAdmins, adminFaceUrl } from "../core/faces.js";

export const PADS = ["left", "right", "jump", "duck"];
/** The theme of the world, and the admin's own while he fights (core/themes.js). */
export let MUSIC = 0;
/** On a phone, toasts and tips sit above the pads: the track runs up the middle. */
export const PHONE_MESSAGES = "bottom";
// The Salesforce items of the track, the Kenney islands far away, the vegetables
export const MODELS = ["salesforce", "platform", "vegetables"];

// What VS Code only sees after a restart: they land on the PATH
const NEEDS_RESTART = ["git", "node", "cli"];
const REQUIRED = ["git", "vscode", "node", "pack", "cli", "plugin", "sfdmu", "sgd", "sfext"];
// The tools each section brings, for the goal line
const BY_SECTION = [
  ["git", "vscode", "node", "pack"],
  ["cli", "plugin", "sfdmu"],
  ["sgd", "sfext"]
];
// Where each required item comes down the track, and in which lane
const PLACES = {
  git: [40, 1],
  vscode: [105, 0],
  node: [175, 2],
  pack: [250, 1],
  cli: [385, 0],
  plugin: [460, 2],
  sfdmu: [535, 1],
  sgd: [665, 0],
  sfext: [760, 2]
};
// The bonus vegetables, one kind per model of the vegetables pack
const VEGETABLES = ["fennel", "carrot", "bellPepper", "cucumber", "romaine", "parsley"];
const VEGETABLE_MODELS = { fennel: "fennel", carrot: "carrot", bellPepper: "bell-pepper", cucumber: "cucumber", romaine: "romaine", parsley: "parsley" };
const VEGETABLE_COLORS = { fennel: "#7BC96F", carrot: "#FF8A3D", bellPepper: "#E8473B", cucumber: "#3E9B4F", romaine: "#8CD17D", parsley: "#2E844A" };
const VEGETABLE_POINTS = 15;

// The Re-check door ends the third section at FINISH_AT; the admin waits past
// it, on a last stretch the runner keeps clear of its own rows
const FINISH_AT = 850;
const BOSS_SECTION = 55;
const BOSS_AT = FINISH_AT + 30;
// The runner's start speed: the first section's, times its EASY_SPEED
const RUN_START = 7.5;
const RUN_EASY = 0.85;
// The run while he fights, in metres per second: calm, every block is read
const FIGHT_MPS = 7;
// He rolls backwards this far ahead of the guinea pig, and throws from there
const ADMIN_Z = -14;
const ADMIN_SCALE = 1.65;
// His face (a big round portrait for a head) and his laptop, in his own units;
// where a throw leaves his raised hand, in metres
const FACE_Y = 2.95;
const FACE_R = 0.8;
const LAPTOP_Y = 1.62;
const LAPTOP_Z = 0.72;
const HAND_X = 1.1;
const HAND_Y = 5.0;
// A thrown block is in the air this long, then lies on the track
const FLIGHT = 0.5;
// A tool caught reaches his laptop this fast
const TO_ADMIN = 0.45;
// Tools fall on the track this far ahead, from this high
const TOOL_DROP_Z = 12;
const TOOL_DROP_Y = 4.5;
// His excuses: a tool brought takes one
const BOSS_HP = 18;
// Each heart lost to him makes his throws this much slower, up to EASE_MAX
const EASE_PER_HIT = 0.15;
const EASE_MAX = 1.6;
const HEARTS = 5;
// A player out of hearts at him starts the next try at him, within this long.
// Kept by the module, which outlives a world (each try is a fresh one)
const BOSS_RETRY_MS = 15 * 60000;
const BOSS_RETRY_RUNUP = 20;
let bossRetry = null;
// The tools he never installed, brought to him in turn
const GIFTS = ["git", "vscode", "cli", "plugin"];
// What he throws, one kind per move, and its stripe in the colour of the move's badge
const BLOCK_KINDS = ["denied", "old2019", "noadmin"];
const STRIPE_COLORS = { denied: 0xea001e, old2019: 0x2e844a, noadmin: 0xdd7a01 };
// Three stages as his excuses run out: from (tools brought), the warning
// before a throw, the pause after it (a throw every windup + every seconds),
// a tool every so often
const STAGES = [
  { from: 0, windup: 1.1, every: 1.1, tool: 1.9 },
  { from: 5, windup: 0.95, every: 0.95, tool: 1.8 },
  { from: 12, windup: 0.85, every: 0.8, tool: 1.7 }
];
// A tool never lands this close to a block of its lane, in metres
const TOOL_ROOM = 3.5;

export const TEXTS = {
  en: {
    ...RUNNER_TEXTS.en,
    intro: "Your first morning on any Salesforce team: five things to install before anyone gives you a ticket. The Setup panel at the top turns green as you go.",
    how1: "Collect Git, Node.js, VS Code and the extension pack",
    how2: "Arrows or swipe: change lane, Up to jump, Down to duck",
    how3: "Grab vegetables for bonus points, and pick the right doors",
    note: "Your first morning on any Salesforce team. Five things before anyone gives you a ticket. - V.",
    s0: "Install",
    s1: "Setup panel",
    s2: "Re-check",
    panelTitle: "Setup panel",
    stateMissing: "missing",
    stateFound: "installed, not found",
    stateOk: "ready",
    goal0: "Install the 4 tools: {{n}} left",
    goal1: "Run pending installs: Salesforce CLI, sfdx-hardis, SFDMU: {{n}} left",
    goal2: "Last cards: sfdx-git-delta and Salesforce Extension Pack: {{n}} left",
    goalReady: "All collected: get ready for the door",
    goalDoor: "Read the question, steer into the right door",
    goalRestart: "Restart VS Code: grab the restart power-up",
    goalFinish: "Take the green door: Re-check, and every card is green",
    coachStart: "Collect the tools! Left and Right to change lane",
    coachStartTouch: "Collect the tools! Swipe left or right",
    coachFound: "Installed, not found: see the orange card?",
    coachRestart: "Grab the restart power-up!",
    coachGreen: "Setup panel all green!",
    coachFinish: "Green door: Re-check!",
    coachVeg: "Yum! Vegetables are bonus points",
    q0: "Git and Node.js are installed, but VS Code says they are missing. What do you do?",
    q1: "The Setup panel installed the Salesforce CLI, then says it is missing. What now?",
    q2: "VS Code restarted. How do the last cards of the Setup panel turn green?",
    signQuiz: "Which door?",
    signFinish: "Setup panel",
    o_path: "Installed, but VS Code does not see it",
    o_path_tip: "Close VS Code completely, windows and all, and open it again: VS Code only reads the PATH at startup.",
    o_path_s: "PATH",
    o_trust: "Do you trust the publishers of these extensions?",
    o_trust_tip: "Answer Trust Publishers & Install, or the install of the pack stops.",
    o_trust_s: "Trust?",
    o_gitbash: "Errors that look like nothing to do with Git",
    o_gitbash_tip: "Reinstall Git and keep every default, with the Git Bash components ticked.",
    o_gitbash_s: "No Git Bash",
    o_node: "Node.js too old",
    o_node_tip: "Take the LTS version of Node.js, 22 at the least, 24 recommended.",
    o_node_s: "Node.js 20",
    o_checking: "Check in progress",
    o_checking_tip: "Wait for the check to finish, then click the button: it opens the Setup panel.",
    o_checking_s: "Checking...",
    o_cli: "The Setup panel says the Salesforce CLI is missing",
    o_cli_tip: "Close VS Code completely and open it again: the CLI landed on a PATH the open VS Code does not know yet.",
    o_cli_s: "CLI missing",
    o_noext: "The extension does not appear",
    o_noext_tip: "View > Command Palette, then Developer: Reload Window.",
    o_noext_s: "No extension",
    o_redline: "A red line you cannot clear",
    o_redline_tip: "Click the line: the panel says what it tried and what it got back, and that message is nearly always the answer.",
    o_redline_s: "Red line",
    o_outdated: "A screen does not look like the documentation",
    o_outdated_tip: "Tick Auto Update on the extension pack: an outdated extension is the most common cause.",
    o_outdated_s: "Outdated",
    p_pending: "Run pending installs: every missing tool comes to you",
    p_pending_s: "Pending installs",
    p_reload: "Developer: Reload Window: one more attempt",
    p_reload_s: "Reload Window",
    p_vibes: "Agentforce Vibes: Git, Node.js and the editor come with it, nothing can stop you",
    p_vibes_s: "Agentforce Vibes",
    p_single: "The single extension, not the pack",
    p_single_tip: "Take the pack rather than the single extension above it: the pack brings the tools the later levels use.",
    p_single_s: "Single extension",
    p_restart: "VS Code restarted: it sees every tool now",
    p_restart_s: "Restart VS Code",
    g_restart: "Close VS Code completely and open it again",
    g_restart_s: "Restart VS Code",
    g_keep: "Keep VS Code open and wait",
    g_keep_s: "Wait",
    g_keep_tip: "Waiting changes nothing: VS Code only reads the PATH when it starts.",
    g_terminal: "Open a new terminal in VS Code",
    g_terminal_s: "New terminal",
    g_terminal_tip: "A new terminal of the same VS Code still has the old PATH. Close VS Code completely.",
    g_again: "Click Run pending installs again",
    g_again_s: "Run again",
    g_again_tip: "It is installed already. VS Code just cannot see it until it restarts.",
    g_reinstall: "Reinstall the Salesforce CLI",
    g_reinstall_s: "Reinstall CLI",
    g_reinstall_tip: "Reinstalling lands it in the same place, and VS Code still has the old PATH.",
    g_recheck: "Press Re-check on the Setup panel",
    g_recheck_s: "Re-check",
    g_pendingAgain: "Click Run pending installs once more",
    g_pendingAgain_s: "Install again",
    g_pendingAgain_tip: "Everything is installed already: Re-check reads every version again, and what was red for the PATH turns green.",
    g_upgrade: "Treat the amber Upgrade as a failure",
    g_upgrade_s: "Fix Upgrade",
    g_upgrade_tip: "An amber Upgrade is not a failure: a newer version exists, and the button fetches it whenever you like. Missing is the only state that stops you.",
    restarted: "VS Code restarted: {{tools}} found",
    pendingAgain: "Pending installs: {{tools}}",
    stillNotFound: "Still not found: VS Code needs a restart",
    missedTools: "Still pending at the end: {{tools}}. On a real machine, each missing tool is a command that fails later in the project, so each one cost you points.",
    vegetablesCount: "Vegetables: {{n}}.",
    allGreen: "Dependencies up to date: every card is green",
    veg_fennel: "Fennel",
    veg_carrot: "Carrot",
    veg_bellPepper: "Bell pepper",
    veg_cucumber: "Cucumber",
    veg_romaine: "Romaine",
    veg_parsley: "Parsley",
    s3: "Why install?",
    goalAdmin: "Someone rolls up the track on an office chair...",
    goalBoss: "Bring him the tools: {{n}} excuses left",
    goalBeaten: "VS Code is on his laptop too: run to the end",
    coachBoss: "Here comes the admin who never installs anything!",
    coachTools: "Catch the tools: each one flies to him",
    coach_denied: "Access denied: change lane!",
    coach_denied_touch: "Access denied: swipe left or right!",
    coach_old2019: "Version from 2019: jump over it!",
    coach_old2019_touch: "Version from 2019: swipe up!",
    coach_noadmin: "No admin rights: duck under it!",
    coach_noadmin_touch: "No admin rights: swipe down!",
    coachBeaten: "He installed VS Code himself!",
    lesson: "A proper local setup is the first step of any pipeline",
    bossName: 'The "Why install anything?" admin',
    installedSign: "VS Code installed",
    bossExcuses: "Excuses left: {{n}} / {{total}}",
    bHello: "Why install anything? I do everything in Setup and the Developer Console!",
    ex_git: "Git? My backups are in a folder called final_v2!",
    ex_vscode: "VS Code? The Developer Console has a text box!",
    ex_cli: "A command line? I click, I don't type!",
    ex_plugin: "sfdx-hardis? I deploy with change sets, on Friday evenings!",
    bHalf: "Stop it! My laptop is from 2019, it will never run all that!",
    bAngry: "OK, OK... but I will never restart VS Code!",
    bDone: "Fine... I'm installing VS Code. Myself.",
    bite: "{{tool}}: one excuse less",
    vscodeInstalled: "VS Code installed on the admin's laptop",
    retryHint: "Try again starts at the admin.",
    retryBoss: "Back at the admin, your Setup panel as you left it",
    o_denied: "Access denied",
    o_denied_tip: "No right to install on your laptop? Ask for it on day one, or work in Agentforce Vibes: VS Code in a browser tab, launched from an org, the Salesforce CLI already there.",
    o_denied_s: "Access denied",
    o_noadmin: "No admin rights",
    o_noadmin_tip: "A computer where you can install software, and permission to do so: that comes before the first ticket of any project. Ask for it before you need it.",
    o_noadmin_s: "No admin rights",
    o_old2019: "Version from 2019",
    o_old2019_tip: "Old tools break current projects: take Node.js 22 at the least, and tick Auto Update on the extension pack to keep the rest current.",
    o_old2019_s: "Version from 2019"
  },
  fr: {
    ...RUNNER_TEXTS.fr,
    intro: "Votre premier matin dans une équipe Salesforce : cinq choses à installer avant qu'on vous confie un ticket. Le panneau Setup en haut passe au vert à mesure.",
    how1: "Récupérez Git, Node.js, VS Code et le pack d'extensions",
    how2: "Flèches ou swipe : changez de voie, Haut saute, Bas baisse",
    how3: "Attrapez des légumes pour des points bonus, prenez les bonnes portes",
    note: "Votre premier matin dans une équipe Salesforce. Cinq choses avant qu'on vous confie un ticket. - V.",
    s0: "Installer",
    s1: "Panneau Setup",
    s2: "Re-check",
    panelTitle: "Panneau Setup",
    stateMissing: "manquant",
    stateFound: "installé, introuvable",
    stateOk: "prêt",
    goal0: "Installez les 4 outils : encore {{n}}",
    goal1: "Run pending installs : Salesforce CLI, sfdx-hardis, SFDMU : encore {{n}}",
    goal2: "Dernières cartes : sfdx-git-delta et Salesforce Extension Pack : encore {{n}}",
    goalReady: "Tout est récupéré : préparez-vous pour la porte",
    goalDoor: "Lisez la question, prenez la bonne porte",
    goalRestart: "Redémarrez VS Code : attrapez le bonus de redémarrage",
    goalFinish: "Prenez la porte verte : Re-check, et chaque carte est verte",
    coachStart: "Récupérez les outils ! Gauche et Droite pour changer de voie",
    coachStartTouch: "Récupérez les outils ! Swipe à gauche ou à droite",
    coachFound: "Installé, introuvable : vous voyez la carte orange ?",
    coachRestart: "Attrapez le bonus de redémarrage !",
    coachGreen: "Panneau Setup tout vert !",
    coachFinish: "Porte verte : Re-check !",
    coachVeg: "Miam ! Les légumes, ce sont des points bonus",
    q0: "Git et Node.js sont installés, mais VS Code dit qu'ils manquent. Que faites-vous ?",
    q1: "Le panneau Setup a installé la CLI Salesforce, puis dit qu'elle manque. Et maintenant ?",
    q2: "VS Code a redémarré. Comment les dernières cartes du panneau Setup passent-elles au vert ?",
    signQuiz: "Quelle porte ?",
    signFinish: "Panneau Setup",
    o_path: "Installé, mais VS Code ne le voit pas",
    o_path_tip: "Fermez VS Code complètement, toutes fenêtres comprises, et rouvrez-le : VS Code ne lit le PATH qu'au démarrage.",
    o_path_s: "PATH",
    o_trust: "Do you trust the publishers of these extensions?",
    o_trust_tip: "Répondez Trust Publishers & Install, sinon l'installation du pack s'arrête.",
    o_trust_s: "Trust ?",
    o_gitbash: "Des erreurs qui n'ont l'air d'avoir aucun rapport avec Git",
    o_gitbash_tip: "Relancez l'installeur Git et gardez toutes les valeurs par défaut, composants Git Bash cochés.",
    o_gitbash_s: "Pas de Git Bash",
    o_node: "Node.js trop ancien",
    o_node_tip: "Prenez la version LTS de Node.js, 22 au minimum, 24 recommandée.",
    o_node_s: "Node.js 20",
    o_checking: "Check in progress",
    o_checking_tip: "Attendez la fin du contrôle, puis cliquez sur le bouton : il ouvre le panneau Setup.",
    o_checking_s: "Contrôle...",
    o_cli: "Le panneau Setup dit que la CLI Salesforce manque",
    o_cli_tip: "Fermez VS Code complètement et rouvrez-le : la CLI a atterri sur un PATH que le VS Code ouvert ne connaît pas encore.",
    o_cli_s: "CLI manquante",
    o_noext: "L'extension n'apparaît pas",
    o_noext_tip: "View > Command Palette, puis Developer: Reload Window.",
    o_noext_s: "Pas d'extension",
    o_redline: "Une ligne rouge que vous n'arrivez pas à faire passer",
    o_redline_tip: "Cliquez sur la ligne : le panneau dit ce qu'il a tenté et ce qu'on lui a répondu, et ce message est presque toujours la réponse.",
    o_redline_s: "Ligne rouge",
    o_outdated: "Un écran ne ressemble pas à la documentation",
    o_outdated_tip: "Cochez Auto Update sur le pack d'extensions : une extension en retard est la cause la plus fréquente.",
    o_outdated_s: "Pas à jour",
    p_pending: "Run pending installs : chaque outil manquant vient à vous",
    p_pending_s: "Installations",
    p_reload: "Developer: Reload Window : un essai de plus",
    p_reload_s: "Reload Window",
    p_vibes: "Agentforce Vibes : Git, Node.js et l'éditeur viennent avec, rien ne vous arrête",
    p_vibes_s: "Agentforce Vibes",
    p_single: "L'extension seule, pas le pack",
    p_single_tip: "Prenez le pack plutôt que l'extension seule juste au-dessus : le pack apporte les outils dont les niveaux suivants se servent.",
    p_single_s: "Extension seule",
    p_restart: "VS Code redémarré : il voit tous les outils",
    p_restart_s: "Redémarrer VS Code",
    g_restart: "Fermer complètement VS Code et le rouvrir",
    g_restart_s: "Redémarrer VS Code",
    g_keep: "Garder VS Code ouvert et attendre",
    g_keep_s: "Attendre",
    g_keep_tip: "Attendre ne change rien : VS Code ne lit le PATH qu'à son démarrage.",
    g_terminal: "Ouvrir un nouveau terminal dans VS Code",
    g_terminal_s: "Nouveau terminal",
    g_terminal_tip: "Un nouveau terminal du même VS Code a toujours l'ancien PATH. Fermez complètement VS Code.",
    g_again: "Cliquer encore sur Run pending installs",
    g_again_s: "Relancer",
    g_again_tip: "C'est déjà installé. VS Code ne peut juste pas le voir avant de redémarrer.",
    g_reinstall: "Réinstaller la CLI Salesforce",
    g_reinstall_s: "Réinstaller la CLI",
    g_reinstall_tip: "La réinstaller la pose au même endroit, et VS Code a toujours l'ancien PATH.",
    g_recheck: "Appuyer sur Re-check dans le panneau Setup",
    g_recheck_s: "Re-check",
    g_pendingAgain: "Cliquer encore une fois sur Run pending installs",
    g_pendingAgain_s: "Réinstaller",
    g_pendingAgain_tip: "Tout est déjà installé : Re-check relit chaque version, et ce qui était rouge à cause du PATH passe au vert.",
    g_upgrade: "Prendre l'Upgrade orange pour un échec",
    g_upgrade_s: "Corriger Upgrade",
    g_upgrade_tip: "Un Upgrade orange n'est pas un échec : une version plus récente existe, et le bouton ira la chercher quand vous voudrez. Manquant est le seul état qui vous bloque.",
    restarted: "VS Code redémarré : {{tools}} trouvés",
    pendingAgain: "Installations en attente : {{tools}}",
    stillNotFound: "Toujours introuvable : VS Code doit redémarrer",
    missedTools: "Encore en attente à la fin : {{tools}}. Sur une vraie machine, chaque outil manquant est une commande qui échoue plus tard dans le projet : chacun vous a coûté des points.",
    vegetablesCount: "Légumes : {{n}}.",
    allGreen: "Dependencies up to date : chaque carte est verte",
    veg_fennel: "Fenouil",
    veg_carrot: "Carotte",
    veg_bellPepper: "Poivron",
    veg_cucumber: "Concombre",
    veg_romaine: "Romaine",
    veg_parsley: "Persil",
    s3: "Pourquoi installer ?",
    goalAdmin: "Quelqu'un arrive sur la piste, sur une chaise de bureau...",
    goalBoss: "Apportez-lui les outils : encore {{n}} excuses",
    goalBeaten: "VS Code est aussi sur son PC : courez jusqu'au bout",
    coachBoss: "Voici l'admin qui n'installe jamais rien !",
    coachTools: "Attrapez les outils : chacun s'envole vers lui",
    coach_denied: "Accès refusé : changez de voie !",
    coach_denied_touch: "Accès refusé : swipe à gauche ou à droite !",
    coach_old2019: "Version de 2019 : sautez par-dessus !",
    coach_old2019_touch: "Version de 2019 : swipe vers le haut !",
    coach_noadmin: "Pas de droits admin : baissez-vous !",
    coach_noadmin_touch: "Pas de droits admin : swipe vers le bas !",
    coachBeaten: "Il a installé VS Code lui-même !",
    lesson: "Un poste bien installé, c'est la première étape de tout pipeline",
    bossName: "L'admin « Pourquoi installer ? »",
    installedSign: "VS Code installé",
    bossExcuses: "Excuses restantes : {{n}} / {{total}}",
    bHello: "Pourquoi installer quoi que ce soit ? Je fais tout dans le Setup et la Developer Console !",
    ex_git: "Git ? Mes sauvegardes sont dans un dossier final_v2 !",
    ex_vscode: "VS Code ? La Developer Console a une zone de texte !",
    ex_cli: "Une ligne de commande ? Moi, je clique, je ne tape pas !",
    ex_plugin: "sfdx-hardis ? Je déploie avec des change sets, le vendredi soir !",
    bHalf: "Arrêtez ! Mon PC date de 2019, il ne fera jamais tourner tout ça !",
    bAngry: "D'accord, d'accord... mais je ne redémarrerai jamais VS Code !",
    bDone: "Bon... J'installe VS Code. Moi-même.",
    bite: "{{tool}} : une excuse de moins",
    vscodeInstalled: "VS Code installé sur le PC de l'admin",
    retryHint: "Réessayer reprend à l'admin.",
    retryBoss: "Retour à l'admin, votre panneau Setup tel que vous l'avez laissé",
    o_denied: "Accès refusé",
    o_denied_tip: "Pas le droit d'installer sur votre PC ? Demandez-le dès le premier jour, ou travaillez dans Agentforce Vibes : VS Code dans un onglet du navigateur, lancé depuis une org, la CLI Salesforce déjà là.",
    o_denied_s: "Accès refusé",
    o_noadmin: "Pas de droits admin",
    o_noadmin_tip: "Un ordinateur où vous pouvez installer des logiciels, et la permission de le faire : cela passe avant le premier ticket de tout projet. Demandez-la avant d'en avoir besoin.",
    o_noadmin_s: "Pas de droits admin",
    o_old2019: "Version de 2019",
    o_old2019_tip: "Des outils anciens cassent les projets actuels : prenez Node.js 22 au minimum, et cochez Auto Update sur le pack d'extensions pour garder le reste à jour.",
    o_old2019_s: "Version de 2019"
  }
};

/** The strings taken word for word from the labs, checked by scripts/verify/check-easter-egg.mjs. */
export const QUOTES = [
  { lab: "1.1", text: "Run pending installs" },
  { lab: "1.1", text: "Developer: Reload Window" },
  { lab: "1.1", text: "View > Command Palette" },
  { lab: "1.1", text: "Do you trust the publishers of these extensions?" },
  { lab: "1.1", text: "Auto Update" },
  { lab: "1.1", text: "Re-check" },
  { lab: "1.1", text: "Check in progress" },
  { lab: "1.1", text: "Dependencies up to date" },
  { lab: "1.1", text: "Salesforce Extension Pack" },
  { lab: "1.1", text: "SFDMU" },
  { lab: "1.1", text: "sfdx-git-delta" },
  { lab: "1.1", text: "Agentforce Vibes" },
  { lab: "1.1", text: "LTS" }
];

const TOOLS = {
  git: { glyph: "branch", color: "#F05032", label: "Git" },
  vscode: { glyph: "code", color: "#0176D3", label: "VS Code" },
  node: { glyph: "hexagon", color: "#3C873A", label: "Node.js" },
  pack: { glyph: "puzzle", color: "#0B5CAB", label: "Extension pack" },
  cli: { glyph: "cloud", color: "#032D60", label: "Salesforce CLI" },
  plugin: { glyph: "infinity", color: "#9050E9", label: "sfdx-hardis" },
  sfdmu: { glyph: "box", color: "#0D9DDA", label: "SFDMU" },
  sgd: { glyph: "delta", color: "#DD7A01", label: "sfdx-git-delta" },
  sfext: { glyph: "cloud", color: "#06A59A", label: "Salesforce Extension Pack" }
};

export function createWorld(ctx) {
  const { t, hud, THREE, paint } = ctx;
  MUSIC = 0;
  // Out of hearts at the admin a moment ago: this try starts at him, the Setup panel as it was
  const retry = !ctx.params.startAt && bossRetry && Date.now() - bossRetry.at < BOSS_RETRY_MS ? bossRetry : null;
  bossRetry = null;
  const state = {};
  for (const id of REQUIRED) {
    state[id] = "missing";
  }
  const required = {};
  let restartsDone = 0;
  let finished = false;
  // A restart is owed: a wrong door left tools "installed, not found"
  let owed = false;
  // The gate the guinea pig is running at, once its doors are shown
  let nearGate = null;
  let foundTold = false;
  let allGreen = false;
  let greeted = false;
  let vegTold = false;
  let vegetables = 0;
  const eaten = new Set();
  // The tip of a wrong finish door, for the result's "Good to know"
  let finishTip = "";

  const items = {};
  for (const [id, tool] of Object.entries(TOOLS)) {
    // The tools that count are big, with a halo and their name always shown
    items[id] = { glyph: tool.glyph, color: tool.color, label: tool.label, points: 50, big: true };
  }
  for (const id of VEGETABLES) {
    // Instanced models when the vegetables pack is there, a green tile otherwise
    items[id] = { glyph: "star", color: VEGETABLE_COLORS[id], label: t("veg_" + id), points: VEGETABLE_POINTS, model: VEGETABLE_MODELS[id], instanced: true, glowIntensity: 0.3, vegetable: true };
  }
  items.note = { glyph: "note", color: "#F2C94C", label: "?", points: 0, model: "note", glow: 0xffd84d, glowIntensity: 0.8 };
  // The tools that fall in front of the admin: the same tiles, brought to him when caught
  for (const id of GIFTS) {
    items["gift-" + id] = { glyph: TOOLS[id].glyph, color: TOOLS[id].color, label: TOOLS[id].label, points: 0, big: true, gift: id };
  }

  const ob = (move, key, theme, detail) => ({ move, title: "o_" + key, tip: "o_" + key + "_tip", short: "o_" + key + "_s", theme: theme || "error", detail });
  const boss = (def) => Object.assign(def, { boss: true });
  const config = {
    sections: [
      { name: t("s0"), color: 0x2e844a, length: 330, speed: RUN_START, obstacles: ["path", "trust", "gitbash", "node"], items: VEGETABLES, powers: ["reload", "vibes", "single"] },
      { name: t("s1"), color: 0x0176d3, length: 270, obstacles: ["checking", "cli", "noext", "outdated"], items: VEGETABLES, powers: ["pending", "reload", "single"], doubles: 0.1 },
      { name: t("s2"), color: 0x9050e9, length: FINISH_AT - 600, obstacles: ["redline", "outdated", "noext", "path"], items: VEGETABLES, powers: ["pending", "vibes", "reload"], doubles: 0.15 },
      // The admin's stretch: nothing of the runner's own, he brings his blocks
      { name: t("s3"), color: 0xdd7a01, length: BOSS_SECTION, obstacles: [], items: [] }
    ],
    clear: [[FINISH_AT, FINISH_AT + BOSS_SECTION + 40]],
    startAt: retry ? BOSS_AT - BOSS_RETRY_RUNUP : 0,
    // A vegetable's name shows on the first one of its kind only
    labelOnce: VEGETABLES,
    obstacles: {
      path: ob("lane", "path", "warning", "PATH"),
      trust: ob("jump", "trust", "info"),
      gitbash: ob("duck", "gitbash", "warning", "Git Bash"),
      node: ob("jump", "node", "lock", "LTS"),
      checking: ob("duck", "checking", "info", "Check in progress"),
      cli: ob("lane", "cli", "warning", "@salesforce/cli"),
      noext: ob("jump", "noext", "info", "Developer: Reload Window"),
      redline: ob("duck", "redline", "error"),
      outdated: ob("jump", "outdated", "warning", "Auto Update"),
      // What the admin throws across the lanes
      denied: boss(ob("lane", "denied", "error")),
      old2019: boss(ob("jump", "old2019", "info")),
      noadmin: boss(ob("duck", "noadmin", "warning"))
    },
    items,
    powers: {
      pending: { glyph: "loop", color: "#0176D3", label: "Run pending installs", short: "p_pending_s", effect: "magnet", metres: 200, kinds: REQUIRED, toast: "p_pending" },
      reload: { glyph: "loop", color: "#2E844A", label: "Reload Window", short: "p_reload_s", effect: "attempt", toast: "p_reload" },
      vibes: { glyph: "bolt", color: "#9050E9", label: "Agentforce Vibes", short: "p_vibes_s", model: "lwc", glow: 0xffb400, effect: "shield", seconds: 5, toast: "p_vibes" },
      single: { glyph: "error", color: "#BA0517", label: "Single extension", short: "p_single_s", effect: "trap", toast: "p_single", tip: "p_single_tip" },
      restart: { glyph: "loop", color: "#0176D3", label: "Restart VS Code", short: "p_restart_s", model: "check-pass", glow: 0x45c65a, effect: "custom" }
    },
    gates(index) {
      if (index === 0) {
        return restartGate("q0", [
          { text: t("g_keep"), short: t("g_keep_s"), tip: t("g_keep_tip") },
          { text: t("g_terminal"), short: t("g_terminal_s"), tip: t("g_terminal_tip") }
        ]);
      }
      if (index === 1) {
        return restartGate("q1", [
          { text: t("g_again"), short: t("g_again_s"), tip: t("g_again_tip") },
          { text: t("g_reinstall"), short: t("g_reinstall_s"), tip: t("g_reinstall_tip") }
        ]);
      }
      return index === 2 ? finishGate() : null;
    },
    script: [
      ...REQUIRED.map((id) => ({ at: PLACES[id][0] - 80, spawn: id })),
      // Victor's note: high above a hurdle, in the lane nobody takes
      { at: 520, note: true },
      { at: BOSS_AT, boss: true }
    ]
  };

  // The runner asks for the gates again each time it lays a row: build each
  // once, so its doors stay where they were drawn
  const gateSpecs = {};
  function cached(key, make) {
    if (!gateSpecs[key]) {
      gateSpecs[key] = make();
    }
    return gateSpecs[key];
  }

  function restartGate(question, wrong) {
    return cached(question, () => {
      const open = Math.floor(ctx.random() * 3);
      const doors = [];
      let w = 0;
      for (let lane = 0; lane < 3; lane++) {
        doors.push(lane === open ? { text: t("g_restart"), short: t("g_restart_s"), ok: true, look: "quiz", restart: true } : Object.assign({ ok: false, look: "quiz" }, wrong[w++]));
      }
      return { doors, question: t(question), sign: t("signQuiz"), quiz: true };
    });
  }

  /** The finish: Re-check is the green door, and every card turns green. */
  function finishGate() {
    return cached("finish", () => {
      const open = Math.floor(ctx.random() * 3);
      const wrong = [
        { text: t("g_pendingAgain"), short: t("g_pendingAgain_s"), tip: t("g_pendingAgain_tip"), ok: false, look: "closed" },
        { text: t("g_upgrade"), short: t("g_upgrade_s"), tip: t("g_upgrade_tip"), ok: false, look: "trap" }
      ];
      const doors = [];
      let w = 0;
      for (let lane = 0; lane < 3; lane++) {
        doors.push(lane === open ? { text: t("g_recheck"), short: t("g_recheck_s"), ok: true, look: "open", finish: true } : wrong[w++]);
      }
      return { doors, question: t("q2"), sign: t("signFinish"), coach: t("coachFinish"), quiz: true, finish: true };
    });
  }

  // Harder than the first version: the install stays calm, then it runs. The
  // pace follows progress along the whole track: with the admin's stretch at
  // the end, these keep the first 850 m within 0.2 % of the pace they had
  // without it (0.18 and 0.5 on 850 m)
  config.paceCalm = 0.173;
  config.paceGain = 0.565;
  const runner = createRunner(ctx, config);

  /* ---------- The Setup panel at the top ---------- */

  const panel = document.createElement("div");
  panel.className = "gr-w0-panel";
  const title = document.createElement("strong");
  title.textContent = t("panelTitle");
  panel.appendChild(title);
  const cards = {};
  for (const id of REQUIRED) {
    const card = document.createElement("span");
    card.className = "gr-w0-card";
    card.textContent = TOOLS[id].label;
    panel.appendChild(card);
    cards[id] = card;
  }
  // The vegetables eaten so far, at the end of the panel
  const vegCard = document.createElement("span");
  vegCard.className = "gr-w0-veg";
  panel.appendChild(vegCard);
  hud.extra.appendChild(panel);

  function render() {
    let green = 0;
    for (const id of REQUIRED) {
      cards[id].setAttribute("data-state", state[id]);
      cards[id].title = t(state[id] === "ok" ? "stateOk" : state[id] === "found" ? "stateFound" : "stateMissing");
      if (state[id] === "ok") {
        green += 1;
      }
    }
    ctx.setData("installed", green);
    ctx.setData("portal", green === REQUIRED.length ? "open" : "closed");
    return green;
  }
  render();

  function renderVegetables() {
    vegCard.textContent = t("vegetablesCount", { n: vegetables }).replace(/\.$/, "");
    ctx.setData("vegetables", vegetables);
  }
  renderVegetables();

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
    if (runner.distance >= FINISH_AT) {
      // Past the Re-check door, before the admin rolls up
      hud.goal(t("goalAdmin"));
      return;
    }
    if (owed) {
      hud.goal(t("goalRestart"));
      return;
    }
    if (nearGate) {
      hud.goal(nearGate.spec.finish ? t("goalFinish") : t("goalDoor"));
      return;
    }
    const index = Math.min(runner.sectionIndex, BY_SECTION.length - 1);
    const left = BY_SECTION[index].filter((id) => state[id] === "missing").length;
    hud.goal(left ? t("goal" + index, { n: left }) : t("goalReady"));
  }

  function spawnRequired(id, at) {
    const lane = PLACES[id][1];
    required[id] = runner.spawnItem(id, lane, at);
  }

  function restart() {
    const found = REQUIRED.filter((id) => state[id] === "found");
    for (const id of found) {
      state[id] = "ok";
    }
    restartsDone += 1;
    owed = false;
    checkGreen(render());
    if (found.length) {
      hud.toast(t("restarted", { tools: found.map((id) => TOOLS[id].label).join(", ") }), "good");
    }
  }

  /** The first time every card is green, a bigger cheer. */
  function checkGreen(green) {
    if (green === REQUIRED.length && !allGreen) {
      allGreen = true;
      ctx.fx.burst(0, 2, -1, { count: 60, speed: 6, up: 6, life: 1.5 });
      ctx.sound.play("happy");
      runner.coach(t("coachGreen"), 2000, true);
    }
  }

  function pendingTools() {
    return REQUIRED.filter((id) => state[id] !== "ok");
  }

  // Items already behind when the run starts further down the track (guinea-at)
  for (const id of REQUIRED) {
    if (PLACES[id][0] < runner.distance + 10) {
      state[id] = "ok";
    } else if (PLACES[id][0] - 80 < runner.distance) {
      spawnRequired(id, PLACES[id][0]);
    }
  }
  if (retry) {
    // What the last try had installed, restarted and eaten before the admin
    Object.assign(state, retry.state);
    restartsDone = retry.restartsDone;
    vegetables = retry.vegetables;
    finishTip = retry.finishTip;
    allGreen = true;
    renderVegetables();
  }
  render();

  /* ---------- The "Why install anything?" admin, past the Re-check door ---------- */

  // Textures and materials made here, freed by dispose (the painter frees its own)
  const owned = [];
  let disposed = false;
  const shadows = Boolean(ctx.engine.settings && ctx.engine.settings.shadows);
  // He was not met yet: what he throws and what falls are drawn once he is
  const fight = {
    on: false,
    over: false,
    phase: "",
    time: 0,
    clock: 0,
    face: 0,
    bites: 0,
    thrown: 0,
    stage: 0,
    x: 0,
    goalLane: 1,
    move: 0,
    next: 0,
    windup: 0,
    targets: [],
    toolNext: 0,
    sinceCatch: 0,
    order: [],
    flinch: 0,
    swing: 0,
    wobble: 0,
    said: "",
    ease: 1,
    step: 0,
    hits: 0,
    // The stages that already gave a heart back
    hearts: new Set()
  };
  // What has been said once: the coach for each kind of block, his excuse for each tool
  const told = new Set();
  // The blocks on their way and on the track, the tools falling or lying on it
  const shots = [];
  const gifts = [];
  const flights = [];

  /** A face that never came: a plain cartoon one, so the world never waits for a picture. */
  function drawPlainFace(c, size) {
    c.fillStyle = "#ffe2c6";
    c.beginPath();
    c.arc(size / 2, size / 2, size / 2 - 14, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#5a3b22";
    c.beginPath();
    c.arc(size / 2, size * 0.3, size * 0.36, Math.PI, Math.PI * 2);
    c.fill();
    c.fillStyle = "#1b1b28";
    for (const x of [0.38, 0.62]) {
      c.beginPath();
      c.arc(size * x, size * 0.5, size * 0.04, 0, Math.PI * 2);
      c.fill();
    }
    // A frown: he does not want to install anything
    c.lineWidth = size * 0.03;
    c.strokeStyle = "#1b1b28";
    c.beginPath();
    c.arc(size / 2, size * 0.78, size * 0.12, Math.PI * 1.15, Math.PI * 1.85);
    c.stroke();
  }

  /** His portrait on a disc: a plain face at once, the SVG over it once it has loaded. */
  function faceMaterial(n) {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const c = canvas.getContext("2d");
    c.fillStyle = "#ffffff";
    c.beginPath();
    c.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
    c.fill();
    drawPlainFace(c, size);
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
      c.fillStyle = "#ffffff";
      c.beginPath();
      c.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
      c.fill();
      c.save();
      c.beginPath();
      c.arc(size / 2, size / 2, size / 2 - 14, 0, Math.PI * 2);
      c.clip();
      c.drawImage(image, 12, 12, size - 24, size - 24);
      c.restore();
      texture.needsUpdate = true;
    };
    // A face that does not load keeps its plain drawing
    image.onerror = () => {};
    image.src = adminFaceUrl(n);
    return material;
  }

  // His laptop's screen: Setup, a tool for a moment as it lands, VS Code at the end
  const screenCanvas = document.createElement("canvas");
  screenCanvas.width = 256;
  screenCanvas.height = 160;
  const screenContext = screenCanvas.getContext("2d");
  const screenTexture = new THREE.CanvasTexture(screenCanvas);
  screenTexture.colorSpace = THREE.SRGBColorSpace;
  screenTexture.anisotropy = 4;
  const screenMaterial = new THREE.MeshBasicMaterial({ map: screenTexture, toneMapped: false });
  owned.push(screenTexture, screenMaterial);
  let screenLook = "";
  let screenBack = 0;

  function drawScreen(look, id) {
    const key = look + (id || "");
    if (key === screenLook) {
      return;
    }
    screenLook = key;
    const c = screenContext;
    const w = screenCanvas.width;
    const h = screenCanvas.height;
    c.clearRect(0, 0, w, h);
    c.textAlign = "center";
    c.textBaseline = "middle";
    if (look === "setup") {
      // Setup, and nothing else: a gear, a list, the Developer Console
      c.fillStyle = SLDS.light;
      c.fillRect(0, 0, w, h);
      c.fillStyle = SLDS.navy;
      c.fillRect(0, 0, w, 44);
      glyph(c, "gear", 26, 22, 34, SLDS.white);
      c.fillStyle = SLDS.white;
      c.textAlign = "left";
      fitText(c, "Setup", 50, 23, 190, 28, "800");
      for (let i = 0; i < 3; i++) {
        rounded(c, 16, 60 + i * 22, 120 - (i % 2) * 34, 11, 5);
        c.fillStyle = i === 0 ? SLDS.brand : SLDS.border;
        c.fill();
      }
      glyph(c, "gear", 200, 88, 82, SLDS.navy);
      rounded(c, 12, 128, w - 24, 24, 8);
      c.fillStyle = SLDS.weak;
      c.fill();
      c.fillStyle = SLDS.white;
      c.textAlign = "center";
      fitText(c, "Developer Console", w / 2, 141, w - 40, 17, "700");
    } else {
      // A tool as it lands, or VS Code once he installs it himself
      const tool = TOOLS[look === "vscode" ? "vscode" : id];
      c.fillStyle = tool.color;
      c.fillRect(0, 0, w, h);
      glyph(c, tool.glyph, w / 2, 62, 92, SLDS.white);
      c.fillStyle = SLDS.white;
      fitText(c, tool.label, w / 2, 130, w - 24, 30, "800");
    }
    screenTexture.needsUpdate = true;
  }
  drawScreen("setup");

  /** The admin: on an office chair that rolls backwards, his laptop held up, the big round portrait for a head. */
  function buildAdmin() {
    const group = new THREE.Group();
    group.scale.setScalar(ADMIN_SCALE);
    group.visible = false;
    ctx.root.add(group);
    const limb = paint.geometry("w0-limb", () => new THREE.CapsuleGeometry(0.13, 0.62, 4, 10).translate(0, -0.42, 0));
    const torso = paint.geometry("w0-torso", () => new THREE.CapsuleGeometry(0.46, 0.5, 6, 14));
    const disc = paint.geometry("w0-face", () => new THREE.CircleGeometry(FACE_R, 40));
    const cube = paint.geometry("w0-cube", () => new THREE.BoxGeometry(1, 1, 1));
    const rod = paint.geometry("w0-rod", () => new THREE.CylinderGeometry(0.07, 0.07, 1, 10));
    const wheelShape = paint.geometry("w0-wheel", () => new THREE.SphereGeometry(0.1, 10, 8));
    const trousers = paint.plain(0x2b3550, { roughness: 0.7 });
    const sweater = paint.plain(0xc8691c, { roughness: 0.65 });
    const chair = paint.plain(0x2f313b, { roughness: 0.5 });
    const metal = paint.plain(0xa7b0ba, { roughness: 0.35, metalness: 0.5 });
    const part = (geometry, material, parent, x, y, z, sx, sy, sz) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      if (sx) {
        mesh.scale.set(sx, sy, sz);
      }
      mesh.castShadow = shadows;
      parent.add(mesh);
      return mesh;
    };
    // The chair: a seat, a back, a pole, five feet on wheels
    part(cube, chair, group, 0, 1.02, 0, 1.0, 0.16, 0.9);
    part(cube, chair, group, 0, 1.7, -0.5, 0.95, 1.05, 0.14);
    part(rod, metal, group, 0, 0.6, 0, 1, 0.75, 1);
    const wheels = [];
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5;
      const foot = part(cube, metal, group, Math.sin(angle) * 0.28, 0.2, Math.cos(angle) * 0.28, 0.08, 0.06, 0.56);
      foot.rotation.y = angle;
      wheels.push(part(wheelShape, chair, group, Math.sin(angle) * 0.55, 0.1, Math.cos(angle) * 0.55));
    }
    // Seated: the thighs forward, the shins down
    for (const x of [-0.2, 0.2]) {
      const thigh = part(limb, trousers, group, x, 1.18, -0.05, 1.25, 1.05, 1.25);
      thigh.rotation.x = -Math.PI / 2;
      part(limb, trousers, group, x, 1.12, 0.78, 1.2, 1.05, 1.2);
    }
    const body = part(torso, sweater, group, 0, 1.68, 0);
    body.scale.set(1.1, 1, 0.75);
    const left = part(limb, sweater, group, -0.6, 2.1, 0);
    const right = part(limb, sweater, group, 0.6, 2.1, 0);
    // The laptop, held up open towards the guinea pig: a base, a lid, the screen
    const laptop = new THREE.Group();
    laptop.position.set(-0.05, LAPTOP_Y, LAPTOP_Z);
    laptop.rotation.x = -0.12;
    group.add(laptop);
    part(cube, metal, laptop, 0, -0.36, -0.28, 1.04, 0.05, 0.62);
    part(cube, metal, laptop, 0, 0, -0.02, 1.04, 0.7, 0.04);
    const screen = new THREE.Mesh(paint.geometry("w0-screen", () => new THREE.PlaneGeometry(0.94, 0.6)), screenMaterial);
    screen.position.z = 0.002;
    screen.renderOrder = 1;
    laptop.add(screen);
    const faceMat = faceMaterial(fight.face || 1);
    const face = part(disc, faceMat, group, 0, FACE_Y, 0.4);
    face.castShadow = false;
    face.renderOrder = 1;
    const name = paint.sign("w0-admin", t("s3"), { color: SLDS.warningDark, glyph: "lock", height: 0.42 });
    name.position.y = FACE_Y + FACE_R + 0.36;
    group.add(name);
    const installed = paint.sign("w0-installed", t("installedSign"), { color: SLDS.success, glyph: "check", height: 0.5 });
    installed.position.y = FACE_Y + FACE_R + 0.42;
    installed.visible = false;
    group.add(installed);
    return { group, wheels, left, right, laptop, face, faceMat, name, installed };
  }

  // Built when he comes, with the face picked then
  let admin = null;

  // The warning on the track in each lane of a throw, from him to the guinea pig
  const stripeGeometry = paint.geometry("w0-stripe", () => new THREE.PlaneGeometry(1.8, 1).rotateX(-Math.PI / 2).translate(0, 0, -0.5));
  // The colour of the move between two white edges: it reads on a lane of any colour
  const stripeLook = {};
  for (const kind of BLOCK_KINDS) {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 4;
    const c = canvas.getContext("2d");
    c.fillStyle = "#ffffff";
    c.fillRect(0, 0, 64, 4);
    c.fillStyle = "#" + STRIPE_COLORS[kind].toString(16).padStart(6, "0");
    c.fillRect(6, 0, 52, 4);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    stripeLook[kind] = new THREE.MeshBasicMaterial({ map, transparent: true, opacity: 0.6, depthWrite: false, toneMapped: false });
    owned.push(map, stripeLook[kind]);
  }
  const stripes = [];

  function takeStripe(kind, lane) {
    let stripe = stripes.find((s) => !s.used);
    if (!stripe) {
      if (stripes.length >= 8) {
        return null;
      }
      const mesh = new THREE.Mesh(stripeGeometry, stripeLook[kind]);
      mesh.position.y = 0.03;
      mesh.renderOrder = 1;
      ctx.root.add(mesh);
      stripe = { mesh, used: false };
      stripes.push(stripe);
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

  // The tools on their way to his laptop: one tile per tool, made when first thrown
  const flightShape = paint.geometry("w0-flight", () => new THREE.PlaneGeometry(0.78, 0.78));
  function takeFlight(id) {
    let flight = flights.find((f) => !f.live && f.id === id);
    if (!flight) {
      const material = paint.tile("w0-flight-" + id, TOOLS[id].color, TOOLS[id].glyph);
      material.side = THREE.DoubleSide;
      const mesh = new THREE.Mesh(flightShape, material);
      ctx.root.add(mesh);
      flight = { mesh, id, live: false, t: 0, x0: 0, y0: 0 };
      flights.push(flight);
    }
    return flight;
  }

  /* His bar in the HUD: his face, his name, his excuses, what he says */
  const bossPanel = document.createElement("div");
  bossPanel.className = "gr-w0-boss";
  bossPanel.hidden = true;
  const bossFace = document.createElement("img");
  bossFace.alt = "";
  bossFace.decoding = "async";
  bossFace.addEventListener("error", () => {
    bossFace.hidden = true;
  });
  const bossMain = document.createElement("div");
  const bossName = document.createElement("strong");
  bossName.textContent = t("bossName");
  const bossBar = document.createElement("i");
  const bossFill = document.createElement("b");
  bossBar.appendChild(bossFill);
  const bossCount = document.createElement("span");
  const bossSay = document.createElement("q");
  bossMain.append(bossName, bossBar, bossCount, bossSay);
  bossPanel.append(bossFace, bossMain);
  hud.extra.appendChild(bossPanel);

  function renderBoss() {
    const left = Math.max(0, BOSS_HP - fight.bites);
    bossCount.textContent = t("bossExcuses", { n: left, total: BOSS_HP });
    bossFill.style.width = (left / BOSS_HP) * 100 + "%";
    bossSay.textContent = fight.said ? t(fight.said) : "";
    bossSay.hidden = !fight.said;
    bossPanel.classList.toggle("is-angry", fight.stage === 2 && fight.phase === "fight");
    bossPanel.classList.toggle("is-done", fight.phase === "beaten" || fight.phase === "done");
    ctx.setData("boss", fight.phase || "off");
    ctx.setData("boss-hp", left);
    ctx.setData("bites", fight.bites);
    ctx.setData("thrown", fight.thrown);
  }

  function say(key) {
    fight.said = key;
    renderBoss();
  }

  function fightGoal() {
    if (fight.phase === "beaten" || fight.phase === "done") {
      return t("goalBeaten");
    }
    return t("goalBoss", { n: Math.max(0, BOSS_HP - fight.bites) });
  }

  /** The track holds: he rolls in, and the fight starts. */
  function startBoss() {
    if (fight.on || fight.over) {
      return;
    }
    fight.on = true;
    // His face: another admin than at the last play, drawn when he is shown
    fight.face = pickAdmins(0, ctx.random)[0];
    fight.order = shuffled(GIFTS, ctx.random);
    admin = buildAdmin();
    bossFace.src = adminFaceUrl(fight.face);
    runner.hold(true);
    // Whatever the pace there, the fight runs at FIGHT_MPS
    runner.setSpeedFactor(FIGHT_MPS / (RUN_START * RUN_EASY * Math.max(1, runner.pace)));
    panel.hidden = true;
    bossPanel.hidden = false;
    MUSIC = "0-admin";
    // A player who lost a lot on the way comes to him with a heart back
    if (ctx.attempts < 3) {
      ctx.gainAttempt();
    }
    fight.phase = "enter";
    fight.time = 0;
    fight.x = runner.LANES[1];
    admin.group.visible = true;
    admin.group.position.set(fight.x, 0, ADMIN_Z - 34);
    ctx.sound.play("bossIn");
    say("bHello");
    runner.coach(t("coachBoss"), 2400, true);
    updateGoal();
  }

  function fightStep(dt, time) {
    fight.time += dt;
    if (fight.phase !== "done") {
      fight.clock += dt;
    }
    fight.sinceCatch += dt;
    const g = admin.group;
    switch (fight.phase) {
      case "enter": {
        // He rolls in from far down the track, backwards, on his chair
        const u = Math.min(1, fight.time / 1.6);
        g.position.z = ADMIN_Z - 34 * (1 - u) * (1 - u);
        if (u >= 1) {
          fight.phase = "talk";
          fight.time = 0;
          renderBoss();
        }
        break;
      }
      case "talk":
        // His line is read before the first throw, then the coach says what to catch
        if (fight.time > 1.2) {
          fight.phase = "fight";
          ctx.bossStarted();
          fight.time = 0;
          fight.next = 0.5;
          fight.toolNext = 0.2;
          runner.coach(t("coachTools"), 2200, true);
          renderBoss();
        }
        break;
      case "fight":
        fightTurn(dt);
        break;
      case "beaten":
      case "done":
        beatenStep(dt);
        break;
      default:
        break;
    }
    g.position.x = fight.x;
    if (screenBack > 0) {
      screenBack -= dt;
      if (screenBack <= 0 && fight.phase === "fight") {
        drawScreen("setup");
      }
    }
    poseAdmin(dt, time);
    moveShots(dt);
    moveGifts(dt);
    moveFlights(dt);
  }

  /** One frame of the fight: he strafes, winds up, throws; tools fall. */
  function fightTurn(dt) {
    const stage = STAGES[fight.stage];
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
      if (fight.next <= 0) {
        windUp(stage);
      }
    }
    if (fight.windup <= 0) {
      const target = runner.LANES[fight.goalLane];
      const step = 4.5 * dt;
      fight.x += Math.max(-step, Math.min(step, target - fight.x));
    }
    fight.toolNext -= dt;
    if (fight.toolNext <= 0) {
      fight.toolNext = dropGift() ? stage.tool : 0.3;
    }
  }

  /** A tool lies far ahead in this lane: a wall landing right behind it could not be dodged. */
  function toolAhead(lane) {
    return gifts.some((g) => !g.object.done && !g.object.removed && g.object.type === "item" && g.object.lane === lane && g.object.at - runner.distance > 8.5);
  }

  /**
   * His next throw, a row across the lanes. A wall ("Access denied") blocks
   * its lane, so a row has one at most: there is always a lane to change to,
   * and every other block is beaten where it lands (jump or duck).
   */
  function pickRow() {
    const lane = runner.lane;
    const pick = (list) => list[Math.floor(ctx.random() * list.length)];
    const bar = () => (ctx.random() < 0.5 ? "old2019" : "noadmin");
    let row;
    if (fight.thrown < 3) {
      // The first three teach one kind each: a wall, a low block, a high bar
      row = [{ lane, kind: BLOCK_KINDS[fight.thrown] }];
    } else if (fight.stage === 0) {
      row = [{ lane, kind: pick(BLOCK_KINDS) }];
    } else {
      const r = ctx.random();
      const others = [0, 1, 2].filter((l) => l !== lane);
      if (r < (fight.stage === 1 ? 0.25 : 0.3)) {
        // A bar across the whole track: jump it or duck it
        const kind = bar();
        row = [0, 1, 2].map((l) => ({ lane: l, kind }));
      } else if (fight.stage === 2 && r < 0.7) {
        // All three at once: one lane to leave, two to jump or duck
        const kinds = shuffled(BLOCK_KINDS, ctx.random);
        row = [0, 1, 2].map((l, i) => ({ lane: l, kind: kinds[i] }));
      } else if (r < 0.75) {
        const first = pick(BLOCK_KINDS);
        row = [
          { lane, kind: first },
          { lane: pick(others), kind: first === "denied" ? bar() : pick(BLOCK_KINDS) }
        ];
      } else {
        row = [{ lane, kind: pick(BLOCK_KINDS) }];
      }
    }
    for (const target of row) {
      if (target.kind === "denied" && toolAhead(target.lane)) {
        target.kind = bar();
      }
    }
    return row;
  }

  /** The warning: his arm goes up, the lanes of the throw turn the colour of their move. */
  function windUp(stage) {
    const targets = pickRow();
    for (const target of targets) {
      target.stripe = takeStripe(target.kind, target.lane);
    }
    fight.targets = targets;
    fight.windup = stage.windup * fight.ease;
    fight.next = stage.every * fight.ease;
    // The first block of each kind: the coach says what beats it (a try that
    // starts here gets the runner's own lesson for each move instead)
    const kind = targets[0].kind;
    if (!told.has(kind) && !retry && !ctx.params.startAt) {
      told.add(kind);
      runner.coach(t("coach_" + kind + (hud.touch ? "_touch" : "")), 1500, true);
    }
  }

  function release() {
    fight.targets.forEach((target, i) => {
      const object = runner.spawnObstacle(target.kind, target.lane, runner.distance - ADMIN_Z - 0.8);
      if (!object) {
        dropStripe(target.stripe);
        return;
      }
      object.mesh.scale.setScalar(0.45);
      // A row leaves his hand one block after the other, a little apart
      shots.push({ object, t: -i * 0.07, fromX: fight.x + HAND_X, stripe: target.stripe });
    });
    fight.targets = [];
    fight.thrown += 1;
    fight.swing = 0.35;
    ctx.sound.play("w0Denied");
    renderBoss();
  }

  /**
   * A tool falls on a lane with no block near the spot it falls on (a lane
   * about to be thrown at is busy too). False when every lane is busy.
   */
  function dropGift() {
    const busy = new Set(fight.targets.map((target) => target.lane));
    for (const shot of shots) {
      if (Math.abs(shot.object.at - runner.distance - TOOL_DROP_Z) < TOOL_ROOM) {
        busy.add(shot.object.lane);
      }
    }
    const free = [0, 1, 2].filter((lane) => !busy.has(lane));
    if (!free.length) {
      return false;
    }
    // A while without a catch: it falls right in the guinea pig's lane
    const lane = fight.sinceCatch > 5 && free.includes(runner.lane) ? runner.lane : free[Math.floor(ctx.random() * free.length)];
    if (!fight.order.length) {
      fight.order = shuffled(GIFTS, ctx.random);
    }
    const id = fight.order.shift();
    const object = runner.spawnItem("gift-" + id, lane, runner.distance + TOOL_DROP_Z, TOOL_DROP_Y);
    if (object) {
      gifts.push({ object, vy: 0, landed: false });
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
      const u = Math.min(1, Math.max(0, shot.t) / FLIGHT);
      o.mesh.position.x = shot.fromX + (o.x - shot.fromX) * u;
      o.mesh.position.y = (1 - u) * HAND_Y + 4 * u * (1 - u) * 0.6;
      o.mesh.rotation.x = (1 - u) * 2.4;
      o.mesh.scale.setScalar(0.45 + 0.55 * u);
      if (u >= 1 && !shot.landed) {
        shot.landed = true;
        ctx.fx.burst(o.x, 0.3, -(o.at - runner.distance), { count: 8, colors: [0xffffff, STRIPE_COLORS[o.kind] || 0xea001e], speed: 2.5, up: 2, life: 0.5 });
      }
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

  function moveGifts(dt) {
    const v = runner.speed;
    for (let i = gifts.length - 1; i >= 0; i--) {
      const gift = gifts[i];
      const o = gift.object;
      if (o.removed || o.done) {
        gifts.splice(i, 1);
        continue;
      }
      o.at -= v * dt;
      if (!gift.landed) {
        gift.vy -= 20 * dt;
        o.y = Math.max(0.85, o.y + gift.vy * dt);
        if (o.y <= 0.85) {
          gift.landed = true;
          ctx.fx.burst(o.x, 0.4, -(o.at - runner.distance), { count: 8, colors: [0xffffff, 0xffd84d], speed: 2, up: 2, life: 0.5 });
        }
      }
    }
  }

  /** Caught: the guinea pig sends it at once to his laptop. */
  function sendGift(id) {
    const flight = takeFlight(id);
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
    const toY = LAPTOP_Y * ADMIN_SCALE;
    const toZ = ADMIN_Z + LAPTOP_Z * ADMIN_SCALE + 0.3;
    for (const flight of flights) {
      if (!flight.live) {
        continue;
      }
      flight.t += dt;
      const u = Math.min(1, flight.t / TO_ADMIN);
      flight.mesh.position.set(flight.x0 + (fight.x - flight.x0) * u, flight.y0 + (toY - flight.y0) * u + Math.sin(u * Math.PI) * 1.6, -0.4 + (toZ + 0.4) * u);
      flight.mesh.rotation.set(0, flight.t * 9, 0);
      if (u >= 1) {
        flight.live = false;
        flight.mesh.visible = false;
        landGift(flight.id);
      }
    }
  }

  /** On his laptop: one excuse less. */
  function landGift(id) {
    fight.flinch = 0.35;
    fight.wobble = 0.5;
    ctx.fx.burst(fight.x, LAPTOP_Y * ADMIN_SCALE, ADMIN_Z + LAPTOP_Z * ADMIN_SCALE + 0.4, { count: 26, colors: [new THREE.Color(TOOLS[id].color).getHex(), 0xffffff, 0xffd84d], speed: 4, up: 3, life: 0.8 });
    ctx.sound.play("w0Install");
    if (fight.phase !== "fight") {
      return;
    }
    drawScreen("tool", id);
    screenBack = 0.9;
    fight.bites += 1;
    ctx.collect(30, t("bite", { tool: TOOLS[id].label }));
    const next = STAGES[fight.stage + 1];
    if (next && fight.bites >= next.from) {
      fight.stage += 1;
      fight.said = fight.stage === 1 ? "bHalf" : "bAngry";
      heartBack();
    } else if (!told.has("ex_" + id)) {
      // His excuse for each tool, the first time it reaches him
      told.add("ex_" + id);
      fight.said = "ex_" + id;
    }
    renderBoss();
    if (fight.bites >= BOSS_HP) {
      beatAdmin();
    }
    updateGoal();
  }

  /** Hearts lost: at each new stage, Developer: Reload Window comes down a free lane, one attempt back. */
  function heartBack() {
    if (fight.hearts.has(fight.stage) || ctx.attempts >= HEARTS) {
      return;
    }
    fight.hearts.add(fight.stage);
    const free = [0, 1, 2].filter((lane) => !fight.targets.some((target) => target.lane === lane));
    const power = runner.spawnPower("reload", free.includes(runner.lane) ? runner.lane : free[0] || 0, runner.distance + 12);
    if (power) {
      gifts.push({ object: power, vy: 0, landed: true });
    }
  }

  /** Nothing more comes at the guinea pig: the blocks and the tools go. */
  function clearTrack() {
    for (const target of fight.targets) {
      dropStripe(target.stripe);
    }
    fight.targets = [];
    fight.windup = 0;
    for (const list of [shots, gifts]) {
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

  /** Out of excuses: he gives in. */
  function beatAdmin() {
    fight.phase = "beaten";
    fight.time = 0;
    fight.step = 0;
    clearTrack();
    say("bDone");
    admin.name.visible = false;
    ctx.fx.burst(fight.x, 4, ADMIN_Z + 1, { count: 70, colors: [0x0176d3, 0x45c65a, 0xffb400, 0xffffff], speed: 6, up: 6, life: 1.4 });
    ctx.sound.play("bossDown");
    ctx.points(200);
    runner.coach(t("coachBeaten"), 2400, true);
    runner.hop();
    MUSIC = 0;
    updateGoal();
  }

  /** He types, VS Code comes up on his laptop, and the track runs again. */
  function beatenStep() {
    const time = fight.time;
    if (fight.step === 0 && time > 0.9) {
      fight.step = 1;
      drawScreen("vscode");
      admin.installed.visible = true;
      ctx.fx.burst(fight.x, LAPTOP_Y * ADMIN_SCALE, ADMIN_Z + LAPTOP_Z * ADMIN_SCALE + 0.4, { count: 50, colors: [0x0176d3, 0x1b96ff, 0xffffff], speed: 5, up: 4, life: 1.2 });
      ctx.sound.play("fanfare");
      hud.toast(t("vscodeInstalled"), "good");
    }
    if (fight.step === 1 && time > 2.7) {
      fight.step = 2;
      runner.coach(t("lesson"), 3200, true);
    }
    if (fight.step === 2 && time > 3.2) {
      fight.step = 3;
      endBoss();
    }
  }

  /** Back to the run: what is left of the track, with him rolling ahead, VS Code open. */
  function endBoss() {
    ctx.bossBeaten();
    fight.phase = "done";
    fight.over = true;
    runner.hold(false);
    ctx.setData("bosstime", fight.clock.toFixed(1));
    renderBoss();
    updateGoal();
  }

  /** Rolling backwards, the arm that throws, a flinch and a spin of the chair at each tool. */
  function poseAdmin(dt, time) {
    const a = admin;
    a.group.position.y = Math.abs(Math.sin(time * 9)) * 0.04;
    for (const wheel of a.wheels) {
      wheel.rotation.x += dt * 12;
    }
    fight.flinch = Math.max(0, fight.flinch - dt);
    fight.swing = Math.max(0, fight.swing - dt);
    fight.wobble = Math.max(0, fight.wobble - dt);
    a.group.rotation.x = -fight.flinch * 0.6;
    a.group.rotation.y = Math.sin(fight.wobble * 22) * fight.wobble * 0.9;
    a.face.scale.setScalar(1 + fight.flinch * 0.5);
    const typing = fight.phase === "beaten" || fight.phase === "done";
    // The left hand holds the laptop up; the right one winds up, throws, and comes back to it
    let arm = fight.windup > 0 ? 3.0 : fight.swing > 0 ? -1.3 * (fight.swing / 0.35) : -1.0;
    if (typing) {
      arm = -1.15 + Math.sin(time * 26) * 0.12;
    }
    a.right.rotation.x += (arm - a.right.rotation.x) * Math.min(1, dt * 14);
    a.right.rotation.z = 0.15;
    a.left.rotation.x = typing ? -1.15 + Math.sin(time * 26 + 1.7) * 0.12 : -1.0;
    a.left.rotation.z = -0.15;
    const pulse = 0.55 + Math.abs(Math.sin(time * 9)) * 0.3;
    for (const kind of BLOCK_KINDS) {
      stripeLook[kind].opacity = pulse;
    }
  }

  /** A hit by a block: a heart, and on the last one, the next try starts here. */
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
    fight.hits += 1;
    ctx.setData("boss-hits", fight.hits + ":" + event.kind);
    ctx.loseAttempt(t(event.def.title), t(event.def.tip) + (last ? " " + t("retryHint") : ""));
    if (!ctx.playing) {
      bossRetry = { at: Date.now(), state: Object.assign({}, state), restartsDone, vegetables, finishTip };
    }
  }

  /* ---------- The world playing itself, for the check ---------- */

  // window.__guineaRun only exists for checks, and so does the track it reads.
  // autoplay(true) plays carefully; autoplay(0.6) is a sloppy player, who
  // sees only that share of the blocks and goes for that share of the tools
  let autoplay = 0;
  let autoMove = 0;
  const noticed = new WeakMap();
  if (window.__guineaRun) {
    window.__guineaRun.w0 = {
      autoplay(on) {
        autoplay = on === false ? 0 : typeof on === "number" ? on : 1;
      }
    };
  }

  /** Whether the player sees this thing at all: always when careful, decided once per thing when sloppy. */
  function notices(o) {
    if (autoplay >= 1) {
      return true;
    }
    if (!noticed.has(o)) {
      noticed.set(o, Math.random() < autoplay);
    }
    return noticed.get(o);
  }

  /** One step of a player: dodge, take the right door, the tools and the vegetables. */
  function autoStep(dt) {
    const track = window.__guineaTrack;
    if (!track) {
      return;
    }
    const d = runner.distance;
    const lane = runner.lane;
    // A wall blocks its lane once it lies close on the track
    const blocked = [false, false, false];
    let door = -1;
    for (const o of track.objects()) {
      if (o.done || o.removed || !notices(o)) {
        continue;
      }
      const dz = o.at - d;
      if (o.type === "obstacle" && dz > -0.8 && dz < 8) {
        const move = o.def.move;
        if (move === "lane") {
          blocked[o.lane] = true;
        } else if ((move === "jump" || move === "gap") && o.lane === lane && dz > 0.2 && dz < 2.3) {
          runner.action("jump");
        } else if (move === "duck" && o.lane === lane && dz > 0.1 && dz < 2.4) {
          runner.action("duck");
        }
      } else if (o.type === "power" && o.def.effect === "trap" && dz > -0.6 && dz < 7) {
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
        if ((o.type === "item" || (o.type === "power" && o.def.effect !== "trap")) && !o.done && !o.removed && notices(o) && dz > 0.4 && dz < 14 && dz < nearest && !blocked[o.lane]) {
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
        runner.action(want < lane ? "left" : "right");
        autoMove = 0.12;
      }
    }
  }

  function onEvent(event) {
    switch (event.type) {
      case "script":
        if (event.step.boss) {
          startBoss();
        } else if (event.step.spawn && !required[event.step.spawn] && state[event.step.spawn] === "missing") {
          spawnRequired(event.step.spawn, PLACES[event.step.spawn][0]);
        } else if (event.step.note) {
          // Past the choice of the second gate: nothing to catch while it runs
          runner.calm(event.step.at + 104);
          runner.spawnObstacle("noext", 0, event.step.at + 104);
          runner.spawnItem("note", 0, event.step.at + 104, 2.1, { label: false });
        }
        return;
      case "section":
        updateGoal();
        return;
      case "gateNear":
        nearGate = event.gate;
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
        if (event.kind === "note") {
          ctx.foundNote();
          return;
        }
        if (event.def.gift) {
          fight.sinceCatch = 0;
          ctx.points(10);
          sendGift(event.def.gift);
          return;
        }
        if (event.def.vegetable) {
          // A vegetable: bonus points and a happy wheek
          vegetables += 1;
          renderVegetables();
          // Its name in the toast the first time each kind is eaten, then just the points
          ctx.collect(VEGETABLE_POINTS, eaten.has(event.kind) ? "" : event.def.label);
          eaten.add(event.kind);
          ctx.sound.play("wheek");
          if (!vegTold) {
            vegTold = true;
            runner.coach(t("coachVeg"), 2000);
          }
          return;
        }
        if (REQUIRED.includes(event.kind)) {
          state[event.kind] = NEEDS_RESTART.includes(event.kind) ? "found" : "ok";
          const green = render();
          ctx.collect(50, TOOLS[event.kind].label + (state[event.kind] === "found" ? " · " + t("stateFound") : ""));
          runner.hop();
          if (state[event.kind] === "found" && !foundTold) {
            foundTold = true;
            runner.coach(t("coachFound"), 2800, true);
          }
          checkGreen(green);
          updateGoal();
          return;
        }
        runner.handle(event);
        return;
      case "power":
        if (event.kind === "restart") {
          ctx.sound.play("power");
          ctx.fx.burst(event.object.x, 1.2, 0, { count: 30, speed: 4, up: 5 });
          restart();
          updateGoal();
          return;
        }
        runner.handle(event);
        return;
      case "gate": {
        nearGate = null;
        if (event.ok && event.door.restart) {
          runner.celebrate(event.lane, 100);
          restart();
          updateGoal();
          return;
        }
        if (event.ok && event.door.finish) {
          runner.celebrate(event.lane, 200);
          ctx.sound.play("fanfare");
          if (!pendingTools().length) {
            hud.toast(t("allGreen"), "good");
          }
          updateGoal();
          return;
        }
        if (event.gate.spec.finish) {
          // The last door is the finish line: a wrong one costs points and
          // says why, never the attempt that would fail the whole world
          ctx.sound.play("wrong");
          ctx.points(-60);
          runner.breakStreak();
          hud.toast(event.door.short || event.door.text, "bad");
          if (event.door.tip) {
            hud.tip(event.door.tip);
            finishTip = event.door.tip;
          }
          updateGoal();
          return;
        }
        runner.handle(event);
        if (event.gate.spec.quiz && REQUIRED.some((id) => state[id] === "found")) {
          // A restart is still owed: it comes down the track as a power-up
          owed = true;
          runner.spawnPower("restart", runner.lane, runner.distance + 45);
          hud.toast(t("stillNotFound"), "bad");
        }
        updateGoal();
        return;
      }
      case "end": {
        // Missing tools never keep anyone out: they cost points and are named
        // on the result, as the Setup panel would still show them pending
        const missing = pendingTools();
        finished = true;
        hud.goal("");
        const info = [t("vegetablesCount", { n: vegetables }), missing.length ? t("missedTools", { tools: missing.map((id) => TOOLS[id].label).join(", ") }) : "", finishTip].filter(Boolean).join(" ");
        ctx.finish((restartsDone >= 2 ? 100 : 0) - missing.length * 40, info);
        return;
      }
      default:
        runner.handle(event);
    }
  }

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
        runner.coach(t(hud.touch ? "coachStartTouch" : "coachStart"), 2800, true);
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
      // A restart owed: once the red toast and the tip are read, say so big
      if (owed === true && runner.coach(t("coachRestart"), 2200)) {
        owed = "told";
      }
      // A required tool that went by uncollected comes back as a pending
      // install, once the choice of a gate is made: nothing comes during it,
      // nor past the Re-check door (it stays pending, the result names it)
      for (const id of REQUIRED) {
        const object = required[id];
        if (runner.choosing || runner.distance >= FINISH_AT || !object || object.done || object.at >= runner.distance - 4 || state[id] !== "missing") {
          continue;
        }
        // Never in the choice of a gate: before it when there is room, else after
        const at = runner.freeSpot(Math.min(runner.distance + 60, FINISH_AT - 25), runner.distance + 20);
        if (at < FINISH_AT - 5) {
          required[id] = runner.spawnItem(id, Math.floor(ctx.random() * 3), at);
          hud.toast(t("pendingAgain", { tools: TOOLS[id].label }), "bad");
        }
      }
    },
    action(name) {
      runner.action(name);
    },
    dispose() {
      disposed = true;
      if (window.__guineaRun && window.__guineaRun.w0) {
        delete window.__guineaRun.w0;
      }
      runner.dispose();
      panel.remove();
      bossPanel.remove();
      for (const thing of owned) {
        thing.dispose();
      }
    }
  };
}

export const CSS =
  RUNNER_CSS +
  `
.guinea-run .gr-w0-panel {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
  max-width: 760px;
  padding: 6px 10px;
  border: 2px solid #ffffff;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 3px 0 rgba(3, 45, 96, 0.25);
  font-size: 13px;
  pointer-events: none;
}
.guinea-run .gr-w0-panel strong {
  margin-right: 4px;
  color: #032d60;
  font-size: 13px;
}
.guinea-run .gr-w0-card {
  padding: 3px 9px;
  border-radius: 999px;
  background: #e8edf3;
  color: #3e3e3c;
  font-weight: 700;
  white-space: nowrap;
  transition: background 0.2s, transform 0.2s;
}
.guinea-run .gr-w0-card[data-state="found"] {
  background: #fe9339;
  color: #181818;
  transform: scale(1.08);
}
.guinea-run .gr-w0-card[data-state="found"]::after {
  content: " ?";
}
.guinea-run .gr-w0-card[data-state="ok"] {
  background: #2e844a;
  color: #ffffff;
}
.guinea-run .gr-w0-card[data-state="ok"]::before {
  content: "\\2713  ";
}
.guinea-run .gr-w0-veg {
  padding: 3px 9px;
  border-radius: 999px;
  background: #fff1d6;
  color: #8a4b00;
  font-weight: 800;
  white-space: nowrap;
}
.guinea-run .gr-w0-panel[hidden],
.guinea-run .gr-w0-boss[hidden],
.guinea-run .gr-w0-boss q[hidden],
.guinea-run .gr-w0-boss img[hidden] {
  display: none;
}
.guinea-run .gr-w0-boss {
  display: flex;
  gap: 10px;
  align-items: center;
  width: min(440px, calc(100vw - 24px));
  box-sizing: border-box;
  padding: 5px 12px 6px 5px;
  border: 2px solid #ffffff;
  border-radius: 14px;
  background: rgba(3, 45, 96, 0.93);
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.3);
  color: #ffffff;
  pointer-events: none;
}
.guinea-run .gr-w0-boss img {
  flex: none;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 0 0 3px #dd7a01;
}
.guinea-run .gr-w0-boss > div {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.guinea-run .gr-w0-boss strong {
  font-size: 14px;
  font-weight: 800;
}
.guinea-run .gr-w0-boss i {
  display: block;
  height: 12px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
}
.guinea-run .gr-w0-boss b {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #ff5d2d, #ea001e);
  transition: width 0.2s;
}
.guinea-run .gr-w0-boss span {
  font-size: 12px;
  font-weight: 700;
  opacity: 0.92;
}
.guinea-run .gr-w0-boss q {
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
.guinea-run .gr-w0-boss q:lang(fr) {
  quotes: "\\00AB\\00A0" "\\00A0\\00BB";
}
.guinea-run .gr-w0-boss.is-angry b {
  background: linear-gradient(90deg, #ea001e, #ba0517);
  animation: gr-w0-blink 0.5s infinite;
}
.guinea-run .gr-w0-boss.is-done {
  background: rgba(46, 132, 74, 0.95);
}
.guinea-run .gr-w0-boss.is-done img {
  box-shadow: 0 0 0 3px #ffffff;
}
@keyframes gr-w0-blink {
  50% {
    opacity: 0.55;
  }
}
/* While the admin is on, the coach speaks beside the track, not over his face and his throws */
@media (min-width: 601px) {
  .guinea-run[data-boss="enter"] .gr-coach,
  .guinea-run[data-boss="talk"] .gr-coach,
  .guinea-run[data-boss="fight"] .gr-coach,
  .guinea-run[data-boss="beaten"] .gr-coach {
    top: 34%;
    left: 79%;
    max-width: min(380px, 38vw);
    padding: 10px 18px;
    font-size: clamp(17px, 2.3vw, 24px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .guinea-run .gr-w0-boss.is-angry b {
    animation: none;
  }
}
@media (max-width: 600px) {
  .guinea-run .gr-w0-boss {
    gap: 8px;
    padding: 4px 8px 4px 4px;
  }
  .guinea-run .gr-w0-boss img {
    width: 50px;
    height: 50px;
  }
  .guinea-run .gr-w0-boss strong {
    font-size: 13px;
  }
  .guinea-run .gr-w0-boss i {
    height: 10px;
  }
  /* The goal line under it says how many excuses are left */
  .guinea-run .gr-w0-boss span {
    display: none;
  }
  .guinea-run .gr-w0-boss q {
    padding: 3px 7px;
    font-size: 12px;
  }
}
@media (max-width: 600px) {
  .guinea-run .gr-w0-panel {
    gap: 3px;
    padding: 4px 6px;
    font-size: 11px;
  }
  .guinea-run .gr-w0-panel strong {
    display: none;
  }
  .guinea-run .gr-w0-card,
  .guinea-run .gr-w0-veg {
    padding: 2px 6px;
  }
}
`;
