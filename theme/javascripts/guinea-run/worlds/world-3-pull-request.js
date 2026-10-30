/*
 * World 3, Open the Pull Request: a puzzle at the
 * desk. The guinea pig sits in front of its Pull Request and gets it green:
 * 1. pick the right base branch: a User Story starts in integration
 * 2. answer the deployment check: three real failures and their fixes
 * 3. declare the deployment actions the release needs, before or after the
 *    metadata deployment, in order, and leave out what is not an action
 * 4. the "I'll do it by hand after" admin: he pulls the declared actions out
 *    of the Pull Request and switches its base to main; the guinea pig puts
 *    them back before his "manual step" timer runs out, until the check is green
 *
 * The plan is saved as it is committed, right or wrong: worlds 6 to 8 build
 * their gates from it, so a misplaced action comes back as a closed door. The
 * admin only takes cards out for a moment: each goes back where it was
 * declared, so the saved plan stays the one the player committed.
 */
import { DEPLOYMENT_ACTIONS } from "../core/story.js";
import { SLDS, fitText, glyph } from "../core/painter.js";
import { pickAdmins, adminFaceUrl } from "../core/faces.js";
import { lineKeeper } from "../hud.js";

// Everything here is touched or dragged: no pads (the keys still work)
export const PADS = [];

// Each card or base put back takes this much of his bar
const BOSS_HP = 8;
// His "manual step" timer, in seconds: time for a thumb, a little less once he is angry
const STEAL_TIME = 9;
const STEAL_TIME_ANGRY = 7.5;
// The card he goes for shakes this long before he takes it
const WINDUP = 1.2;
// A breath between two of his moves, a longer one after a lost heart
const MOVE_GAP = 1.6;
const MOVE_GAP_AFTER_LOSS = 3.2;
// Each heart he takes gives every timer this much more, up to EASE_MAX
const EASE_PER_LOSS = 2;
const EASE_MAX = 4;
// He walks in and says his line before his first move
const ARRIVAL = 2.6;
// A tip after a mistake at the admin shows this long (he waits meanwhile)
const BOSS_TIP_MS = 6000;
// After his last line, the world ends
const LEAVING = 2.8;
// The last seconds of a timer tick
const TICK_FROM = 3;
// His first moves, in order (the reference data is his line); then he picks at random
const BOSS_SCRIPT = ["refdata", "deliverability", "base", "backfill", "schedule", "base", "refdata", "deliverability"];
// The branches a Pull Request can target, in the order of the pipeline
const BRANCHES = ["integration", "uat", "preprod", "main"];
// A player out of hearts at the admin starts the next try at him, within this
// long. Kept by the module, which outlives a world (each try is a fresh one)
const BOSS_RETRY_MS = 15 * 60000;
let bossRetry = null;
// His face when its picture cannot load: a plain one, drawn here
const PLAIN_FACE =
  "data:image/svg+xml," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='#dfe9f5'/><circle cx='50' cy='56' r='30' fill='#f2c9a0'/><path d='M20 50 Q22 18 50 18 Q78 18 80 50 Q70 32 50 32 Q30 32 20 50Z' fill='#5b3a29'/><circle cx='39' cy='56' r='4' fill='#222'/><circle cx='61' cy='56' r='4' fill='#222'/><path d='M38 70 Q50 78 62 70' stroke='#222' stroke-width='3.5' fill='none' stroke-linecap='round'/></svg>"
  );

/** The Kenney office pack (desk, chair, plant, rug, bookcase); the Salesforce items always load. */
export const MODELS = ["office"];

export const TEXTS = {
  en: {
    intro: "US-014 is committed and published. Open its Pull Request and get it ready to merge.",
    how1: "Pick the right base branch for the Pull Request",
    how2: "The check is red: pick the fix for each error",
    how3: "Sort the deployment actions, then keep an admin from taking them out",
    goal1: "Pick the base branch of your Pull Request",
    goal2: "The deployment check is red: pick the fix ({{n}} of 3)",
    goal3: "Sort the 5 cards: Before, After, or not an action",
    coach1: "Which branch first? Think of the pipeline!",
    coach2: "Red check! Read the error, pick the fix",
    coach3: "Now sort the deployment actions",
    wrongShort: "Not this one",
    monitorWait: "Waiting for a base",
    monitorFail: "Check failed",
    monitorGreen: "All checks passed",
    monitorDone: "Ready to merge",
    note: "A PR template is a reminder of what to write, not something to hand in as it came. Nobody reads mine either. - V.",
    prTitle: "US-014 Show the customer tier on accounts",
    step1: "1. Base",
    step2: "2. Deployment check",
    step3: "3. Deployment actions",
    baseQuestion: "Open the Pull Request in your repository: which base branch?",
    baseIntegration: "integration branch",
    baseUat: "uat branch",
    basePreprod: "preprod branch",
    baseMain: "main branch",
    baseUatTip: "The uat branch comes after integration: a User Story is merged into the integration branch first, then promoted to uat with the others.",
    basePreprodTip: "The preprod branch is the last stop before production. A User Story starts in the integration branch.",
    baseMainTip: "The main branch is production. A User Story goes to the integration branch first.",
    baseOk: "Base: the integration branch of your repository. The check starts.",
    checkFailed: "Simulate Deployment failed",
    checkGreen: "All checks have passed",
    q1: "The check fails on the permission set:",
    q1a: "Add Account.Customer_Tier__c to the Pull Request, next to the permission set",
    q1b: "Create the field by hand in the integration org",
    q1c: "Remove Sales_Rep from the Pull Request",
    q1bTip: "Anything you do by hand in one org, you will have to do in every org. The field must travel with the permission set.",
    q1cTip: "Without its permission set, the field deploys green and nobody can see it.",
    q1Ok: "A permission set grants a field: they travel together.",
    q2: "A teammate's Flow, on the same Pull Request now, fails with:",
    q2a: "Is it in the package? Retrieve Account.Tier_Updated__c with the Metadata Retriever, commit, publish again",
    q2b: "Is it in the org? Open Setup and check the field exists",
    q2c: "Re-run all jobs until it passes",
    q2bTip: "The field does exist in your teammate's dev sandbox. A pipeline never reads a developer's org: what is not committed does not exist. Ask is it in the package before is it in the org.",
    q2cTip: "Nothing changes between two runs: the field is still not in the package.",
    q2Ok: "Ask 'is it in the package' before 'is it in the org'.",
    q3: "Mega-Linter is still running. The merge box says:",
    q3a: "Wait for the required checks, or fix and push again",
    q3b: "Ask an admin to bypass the branch protection",
    q3c: "Close the Pull Request and open a new one",
    q3bTip: "There is no way around it, and there is not meant to be: a robot checks your work before a human does.",
    q3cTip: "A new Pull Request runs the same checks from the start. Wait for them, or fix and push.",
    q3Ok: "There is no way around it, and there is not meant to be.",
    actionsTitle: "Deployment Actions",
    actionsHint: "Drag each action before or after the metadata deployment, in the order it must run. One card is not a deployment action: drop it in the bin.",
    actionsKeys: "Drag and drop the cards, or tap a card then a column. Keys: left / right pick a card, up = Before, down = After, Enter = not an action.",
    before: "Before Metadata Deployment",
    after: "After Metadata Deployment",
    bin: "Not a deployment action",
    deployment: "Metadata deployment",
    reset: "Start the board again",
    commit: "Commit and push the actions",
    planMissing: "Place every card first",
    decoy: "Write the manual steps in the team wiki",
    decoyTip: "A manual step that gets done, versus one that lives in a wiki page nobody opens: declare it as a manual action.",
    wrongPre: "{{label}} cannot run before the deployment: what it needs only exists once the metadata is deployed.",
    wrongPost: "{{label}} must happen with the org as it was, before anything is deployed.",
    wrongOrder: "The reference data must be loaded before the batch that reads it is scheduled.",
    wrongDecoy: "{{label}} is not a deployment action.",
    wrongDeclared: "{{label}} is a deployment action: undeclared, it happens once in your org and nowhere else, forever.",
    planSaved: "Actions committed: the next deployments run them",
    planWrong: "Committed with mistakes: the deployments will stop on them",
    planKept: "Your plan was committed with mistakes ({{mistakes}}). World 6 runs it exactly as you declared it: watch the pre-deployment part.",
    templateShow: "Show the rest of the Pull Request template",
    templateLine: "<!-- Victor: ...",
    mariiaPlan: "Deployment actions are defined with the Pull Request, and run during the deployment. Same file for everyone.",
    mariiaBase: "integration, then uat, then preprod, then main. A User Story always starts at the first one.",
    selected: "Selected: {{label}}",
    bossName: "The \"I'll do it by hand after\" admin",
    bossIn: "Deployment actions? Take them out, I'll do it all by hand after. It's faster!",
    coachBoss: "He takes your actions out: put them back in time!",
    coachBase: "He set the base to main: drag it back to integration!",
    goalBoss: "Put back what he takes before his timer ends",
    bossTray: "His list: by hand, after",
    bossTrayEmpty: "Watch the card he reaches for",
    bossKeys: "Drag it back to its column. Keys: up = Before, down = After, left / right pick a card, Enter = base back to integration.",
    bossTouch: "Drag it back to its column, or tap it, then its column.",
    manualIn: "Manual step in {{s}} s",
    mergeIn: "Merged into main in {{s}} s",
    baseLabel: "base:",
    grab_refdata: "I'll load the data by hand after the deployment.",
    grab_deliverability: "Email deliverability? I'll click it in Setup, if I remember.",
    grab_backfill: "The backfill? I'll paste some Apex in the Developer Console.",
    grab_schedule: "The nightly batch? I'll schedule it by hand, one day.",
    grabBase: "Base main! Straight to production, it's faster.",
    hit1: "Hey, I was going to do that!",
    hit2: "Declared? Now everyone will see it...",
    hit3: "Fine, but I know Setup by heart.",
    hit4: "Who reads Pull Requests anyway?",
    hitBase: "Integration first? So slow...",
    bossAngry: "Fine. Two at once, then!",
    bossDone: "Done. By hand. In one org.",
    bossBeaten: "OK, OK... it's all in the Pull Request. I'll stop doing it by hand.",
    bossLesson: "Declared in the Pull Request, the actions run in every org",
    lostAction: "Done by hand: forgotten in the next org",
    lostActionTip: "Done by hand in the integration org only: the uat, preprod and production orgs never get it. Declared in the Pull Request, an action runs in every org.",
    lostBase: "Merged into main: production first!",
    lostBaseTip: "Merged into main, US-014 skips integration, uat and preprod. The base branch is where the Pull Request is merged: a User Story starts in the integration branch.",
    wrongColumn: "{{label}} goes back where you declared it: {{where}}.",
    monitorBoss: "Undeclared step!",
    monitorRunning: "Check running",
    retryHint: "Try again starts at the admin.",
    retryBoss: "Straight back to the admin: your actions are committed"
  },
  fr: {
    intro: "US-014 est commitée et publiée. Ouvrez sa Pull Request et préparez-la pour le merge.",
    how1: "Choisissez la bonne branch de base pour la Pull Request",
    how2: "Le contrôle est rouge : choisissez le correctif de chaque erreur",
    how3: "Rangez les actions de déploiement, puis empêchez un admin de les retirer",
    goal1: "Choisissez la branch de base de votre Pull Request",
    goal2: "Le contrôle de déploiement est rouge : choisissez le correctif ({{n}} sur 3)",
    goal3: "Rangez les 5 cartes : Avant, Après, ou pas une action",
    coach1: "Quelle branch d'abord ? Pensez au pipeline !",
    coach2: "Contrôle rouge ! Lisez l'erreur, choisissez le correctif",
    coach3: "Maintenant, rangez les actions de déploiement",
    wrongShort: "Pas celle-ci",
    monitorWait: "En attente d'une base",
    monitorFail: "Contrôle en échec",
    monitorGreen: "Tous les contrôles passent",
    monitorDone: "Prête pour le merge",
    note: "Un template de PR rappelle quoi écrire, ce n'est pas un formulaire à rendre tel quel. Personne ne lit le mien non plus. - V.",
    prTitle: "US-014 Show the customer tier on accounts",
    step1: "1. Base",
    step2: "2. Contrôle de déploiement",
    step3: "3. Actions de déploiement",
    baseQuestion: "Ouvrir la Pull Request dans votre repository : quelle branch de base ?",
    baseIntegration: "branch integration",
    baseUat: "branch uat",
    basePreprod: "branch preprod",
    baseMain: "branch main",
    baseUatTip: "La branch uat vient après integration : une User Story est d'abord mergée dans la branch integration, puis promue en uat avec les autres.",
    basePreprodTip: "La branch preprod est la dernière étape avant la production. Une User Story commence dans la branch integration.",
    baseMainTip: "La branch main, c'est la production. Une User Story va d'abord dans la branch integration.",
    baseOk: "Base : la branch integration de votre repository. Le contrôle démarre.",
    checkFailed: "Simulate Deployment en échec",
    checkGreen: "Tous les contrôles sont passés",
    q1: "Le contrôle échoue sur le permission set :",
    q1a: "Ajouter Account.Customer_Tier__c à la Pull Request, à côté du permission set",
    q1b: "Créer le champ à la main dans l'org d'integration",
    q1c: "Retirer Sales_Rep de la Pull Request",
    q1bTip: "Tout ce que vous faites à la main dans une org, vous devrez le faire dans chaque org. Le champ doit voyager avec le permission set.",
    q1cTip: "Sans son permission set, le champ se déploie au vert et personne ne le voit.",
    q1Ok: "Un permission set accorde un champ : ils voyagent ensemble.",
    q2: "Le Flow d'une collègue, sur la même Pull Request maintenant, échoue avec :",
    q2a: "Est-ce dans le package ? Récupérer Account.Tier_Updated__c avec le Metadata Retriever, commiter, republier",
    q2b: "Est-ce dans l'org ? Ouvrir Setup et vérifier que le champ existe",
    q2c: "Relancer tous les jobs jusqu'à ce que ça passe",
    q2bTip: "Le champ existe bien dans la sandbox de dev de votre collègue. Un pipeline ne lit jamais l'org d'un développeur : ce qui n'est pas commité n'existe pas. Demandez-vous s'il est dans le package avant de vous demander s'il est dans l'org.",
    q2cTip: "Rien ne change entre deux exécutions : le champ n'est toujours pas dans le package.",
    q2Ok: "Demandez-vous « est-ce dans le package » avant « est-ce dans l'org ».",
    q3: "Mega-Linter tourne encore. La zone de merge dit :",
    q3a: "Attendre les contrôles obligatoires, ou corriger et pousser à nouveau",
    q3b: "Demander à un admin de contourner la protection de branch",
    q3c: "Fermer la Pull Request et en ouvrir une nouvelle",
    q3bTip: "Il n'y a pas de contournement, et il n'est pas censé y en avoir : un robot vérifie votre travail avant un humain.",
    q3cTip: "Une nouvelle Pull Request relance les mêmes contrôles depuis le début. Attendez-les, ou corrigez et poussez.",
    q3Ok: "Il n'y a pas de contournement, et il n'est pas censé y en avoir.",
    actionsTitle: "Deployment Actions",
    actionsHint: "Glissez chaque action avant ou après le déploiement des metadata, dans l'ordre où elle doit s'exécuter. Une carte n'est pas une action de déploiement : déposez-la dans la corbeille.",
    actionsKeys: "Glissez-déposez les cartes, ou touchez une carte puis une colonne. Clavier : gauche / droite choisissent une carte, haut = Before, bas = After, Entrée = pas une action.",
    before: "Before Metadata Deployment",
    after: "After Metadata Deployment",
    bin: "Pas une action de déploiement",
    deployment: "Déploiement des metadata",
    reset: "Recommencer le tableau",
    commit: "Commiter et pousser les actions",
    planMissing: "Placez d'abord toutes les cartes",
    decoy: "Écrire les étapes manuelles dans le wiki de l'équipe",
    decoyTip: "Une étape manuelle qui se fait, contre une étape qui vit dans une page de wiki que personne n'ouvre : déclarez-la comme action manuelle.",
    wrongPre: "{{label}} ne peut pas s'exécuter avant le déploiement : ce dont elle a besoin n'existe qu'une fois les metadata déployées.",
    wrongPost: "{{label}} doit se faire avec l'org telle qu'elle était, avant tout déploiement.",
    wrongOrder: "Les données de référence doivent être chargées avant de planifier le batch qui les lit.",
    wrongDecoy: "{{label}} n'est pas une action de déploiement.",
    wrongDeclared: "{{label}} est une action de déploiement : non déclarée, elle se fait une fois dans votre org et nulle part ailleurs, pour toujours.",
    planSaved: "Actions commitées : les prochains déploiements les exécutent",
    planWrong: "Commitées avec des erreurs : les déploiements s'arrêteront dessus",
    planKept: "Votre plan a été commité avec des erreurs ({{mistakes}}). Le monde 6 l'exécute exactement comme vous l'avez déclaré : surveillez la partie pré-déploiement.",
    templateShow: "Afficher la suite du template de Pull Request",
    templateLine: "<!-- Victor: ...",
    mariiaPlan: "Les actions de déploiement se définissent avec la Pull Request, et s'exécutent pendant le déploiement. Le même fichier pour tout le monde.",
    mariiaBase: "integration, puis uat, puis preprod, puis main. Une User Story commence toujours par la première.",
    selected: "Sélectionnée : {{label}}",
    bossName: "L'admin « je le ferai à la main après »",
    bossIn: "Des actions de déploiement ? Retirez-les, je ferai tout à la main après. C'est plus rapide !",
    coachBoss: "Il retire vos actions : remettez-les à temps !",
    coachBase: "Il a mis la base sur main : ramenez-la sur integration !",
    goalBoss: "Remettez ce qu'il retire avant la fin de son minuteur",
    bossTray: "Sa liste : à la main, après",
    bossTrayEmpty: "Surveillez la carte qu'il vise",
    bossKeys: "Glissez-la dans sa colonne. Clavier : haut = Before, bas = After, gauche / droite choisissent une carte, Entrée = base sur integration.",
    bossTouch: "Glissez-la dans sa colonne, ou touchez-la, puis sa colonne.",
    manualIn: "Étape manuelle dans {{s}} s",
    mergeIn: "Mergée dans main dans {{s}} s",
    baseLabel: "base :",
    grab_refdata: "Je chargerai les données à la main après le déploiement.",
    grab_deliverability: "La délivrabilité des emails ? Je cliquerai dans Setup, si j'y pense.",
    grab_backfill: "Le backfill ? Je collerai un peu d'Apex dans la Developer Console.",
    grab_schedule: "Le batch de nuit ? Je le planifierai à la main, un jour.",
    grabBase: "Base main ! Direct en production, c'est plus rapide.",
    hit1: "Hé, j'allais le faire !",
    hit2: "Déclarée ? Maintenant tout le monde va la voir...",
    hit3: "Bon, mais je connais Setup par cœur.",
    hit4: "Qui lit les Pull Requests, de toute façon ?",
    hitBase: "Integration d'abord ? Que c'est lent...",
    bossAngry: "Très bien. Deux à la fois, alors !",
    bossDone: "Fait. À la main. Dans une seule org.",
    bossBeaten: "D'accord, d'accord... tout est dans la Pull Request. J'arrête de le faire à la main.",
    bossLesson: "Déclarées dans la Pull Request, les actions s'exécutent dans chaque org",
    lostAction: "Faite à la main : oubliée dans l'org suivante",
    lostActionTip: "Faite à la main dans l'org d'integration seulement : les orgs uat, preprod et de production ne l'auront jamais. Déclarée dans la Pull Request, une action s'exécute dans chaque org.",
    lostBase: "Mergée dans main : la production d'abord !",
    lostBaseTip: "Mergée dans main, US-014 saute integration, uat et preprod. La branch de base, c'est là où la Pull Request est mergée : une User Story commence dans la branch integration.",
    wrongColumn: "{{label}} retourne là où vous l'avez déclarée : {{where}}.",
    monitorBoss: "Étape non déclarée !",
    monitorRunning: "Contrôle en cours",
    retryHint: "Réessayer reprend à l'admin.",
    retryBoss: "Retour direct à l'admin : vos actions sont commitées"
  }
};

/** The product words the game shows and the labs also say, word for word, checked by scripts/verify/check-easter-egg.mjs. */
export const QUOTES = [
  { lab: "1.6", text: "INVALID_CROSS_REFERENCE_KEY" },
  { lab: "2.2", text: "Metadata Retriever" },
  { lab: "2.3", text: "After Metadata Deployment" },
  { lab: "2.4", text: "Before Metadata Deployment" },
  { lab: "2.4", text: "Set Email Deliverability to All Email" }
];

// The failing checks: real-looking errors, and the answers
const QUESTIONS = [
  {
    id: "q1",
    error: "Sales_Rep: INVALID_CROSS_REFERENCE_KEY: In field: field - no CustomField named Account.Customer_Tier__c found",
    answers: [
      { key: "q1a", ok: true },
      { key: "q1b", tip: "q1bTip" },
      { key: "q1c", tip: "q1cTip" }
    ],
    lesson: "q1Ok"
  },
  {
    id: "q2",
    error: 'The field "Tier_Updated__c" for the object "Account" doesn\'t exist.',
    answers: [
      { key: "q2a", ok: true },
      { key: "q2b", tip: "q2bTip" },
      { key: "q2c", tip: "q2cTip" }
    ],
    lesson: "q2Ok"
  },
  {
    id: "q3",
    error: "Merging is blocked",
    answers: [
      { key: "q3a", ok: true },
      { key: "q3b", tip: "q3bTip" },
      { key: "q3c", tip: "q3cTip" }
    ],
    lesson: "q3Ok"
  }
];

const TYPE_COLORS = { manual: SLDS.warningDark, apex: SLDS.purple, data: SLDS.teal, "schedule-batch": SLDS.brand, decoy: SLDS.grey };

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
  const { THREE, t, hud, pig, root, paint } = ctx;
  let phase = "base";
  let choice = 0;
  let bounce = 0;
  let wobble = 0;
  let finished = false;
  // A second wrong plan is committed as it is: world 6 then runs it, mistakes included
  let planTries = 0;
  let questionStart = 0;
  let elapsed = 0;
  // The admin's face for this play: guinea-seed replays the same one
  // One of the twenty-one admins, not the one of the last play
  const faceUrl = adminFaceUrl(pickAdmins(3, ctx.random)[0]);
  // A phone shows the Pull Request across the screen; from 1000 px the messages fit over the desk beside it
  const narrow = window.matchMedia ? window.matchMedia("(max-width: 700px)") : { matches: false };
  const roomy = window.matchMedia ? window.matchMedia("(min-width: 1000px)") : { matches: true };
  // Textures and materials made here, freed by dispose (the painter frees its own)
  const owned = [];
  let disposed = false;
  ctx.setData("pace", "1.00");

  /* ---------- The desk, in 3D ---------- */

  /**
   * A model of the office pack at a spot, or null if the pack did not load:
   * each caller keeps its own shape for that case.
   */
  function model(name, options, x, y, z, turn) {
    const thing = ctx.models && ctx.models.get(name, options);
    if (!thing) {
      return null;
    }
    thing.position.set(x, y, z);
    thing.rotation.y = turn || 0;
    thing.userData.size = thing.scale.x;
    root.add(thing);
    return thing;
  }

  /** Stretches a model to a footprint, for furniture the scene was laid out around. */
  function fit(thing, width, depth) {
    const size = new THREE.Box3().setFromObject(thing).getSize(new THREE.Vector3());
    thing.scale.x *= width / Math.max(size.x, 1e-3);
    thing.scale.z *= depth / Math.max(size.z, 1e-3);
  }

  const floor = new THREE.Mesh(paint.geometry("floor", () => new THREE.CylinderGeometry(3.4, 3.5, 0.2, 48)), paint.plain(0xbfe9f5, { roughness: 0.8 }));
  // A round rug under the chair, a wall with the Cloudity plaque, a plant
  if (!model("rugRound", { width: 2.3, shadows: false }, 0, 0.005, 0.15)) {
    const rug = new THREE.Mesh(paint.geometry("rug", () => new THREE.CylinderGeometry(1.15, 1.15, 0.03, 40)), paint.plain(0xff9e2c, { roughness: 0.9 }));
    rug.position.set(0, 0.015, 0.15);
    root.add(rug);
  }
  const wall = new THREE.Mesh(paint.geometry("wall", () => new THREE.BoxGeometry(5.2, 2.8, 0.12)), paint.plain(0xfde7f0, { roughness: 0.9 }));
  wall.position.set(0, 1.4, -2.1);
  root.add(wall);
  // The Cloudity logo on the wall, in 3D; the flat plaque if the items did not load
  if (!model("cloudity-logo", { width: 1.0 }, -2.05, 1.78, -1.75, 0.7)) {
    const plaque = new THREE.Mesh(paint.geometry("plaque", () => new THREE.PlaneGeometry(1.3, 0.63)), paint.plaque());
    plaque.position.set(-1.45, 2.1, -2.03);
    root.add(plaque);
  }
  // What the Pull Request carries: the package of the delta, on the desk
  model("package-xml", { height: 0.3 }, 0.62, 0.8, -1.05, -0.4);
  if (!model("pottedPlant", { height: 1.1 }, 1.75, 0, -1.3)) {
    const pot = new THREE.Mesh(paint.geometry("pot", () => new THREE.CylinderGeometry(0.2, 0.15, 0.36, 18)), paint.plain(0x0176d3));
    pot.position.set(1.7, 0.18, -1.3);
    root.add(pot);
    const leaves = paint.plain(0x2e844a, { roughness: 0.7 });
    [[1.7, 0.6, -1.3, 0.3], [1.55, 0.82, -1.25, 0.22], [1.86, 0.78, -1.36, 0.2]].forEach(([x, y, z, r]) => {
      const leaf = new THREE.Mesh(paint.geometry("leaf", () => new THREE.SphereGeometry(1, 14, 10)), leaves);
      leaf.scale.setScalar(r);
      leaf.position.set(x, y, z);
      root.add(leaf);
    });
  }
  // A bookcase, a bin and a small plant: an office someone works in
  model("bookcaseOpen", { height: 1.7 }, -2.15, 0, -1.65);
  model("books", { height: 0.25, shadows: false }, -0.95, 0.8, -1.2, 0.3);
  model("trashcan", { height: 0.42 }, 1.25, 0, 0.45);
  model("plantSmall2", { height: 0.32, shadows: false }, 0.95, 0.8, -1.2);
  floor.position.y = -0.1;
  floor.receiveShadow = true;
  root.add(floor);
  // The desk top stays at 0.8, where the monitor, the mug and the paws are
  const deskModel = model("desk", { height: 0.8 }, 0, 0, -0.9);
  if (deskModel) {
    fit(deskModel, 2.4, 1.1);
  } else {
    const desk = new THREE.Mesh(paint.geometry("desk", () => new THREE.BoxGeometry(2.4, 0.1, 1.1)), paint.plain(0xc8a27a, { roughness: 0.7 }));
    desk.position.set(0, 0.75, -0.9);
    root.add(desk);
    for (const x of [-1.1, 1.1]) {
      const leg = new THREE.Mesh(paint.geometry("leg", () => new THREE.BoxGeometry(0.08, 0.75, 0.9)), paint.plain(0x8a6a4a));
      leg.position.set(x, 0.37, -0.9);
      root.add(leg);
    }
  }
  // The monitor shows one big status, readable from the camera
  const MONITOR = {
    wait: { color: SLDS.warningDark, glyph: "warning", key: "monitorWait" },
    fail: { color: SLDS.error, glyph: "error", key: "monitorFail" },
    green: { color: SLDS.success, glyph: "check", key: "monitorGreen" },
    done: { color: SLDS.brand, glyph: "star", key: "monitorDone" },
    // The admin's fight: the check runs while everything is declared, warns while he holds something
    running: { color: SLDS.brandDark, glyph: "loop", key: "monitorRunning" },
    boss: { color: SLDS.warningDark, glyph: "warning", key: "monitorBoss" }
  };
  const screens = {};
  for (const [name, look] of Object.entries(MONITOR)) {
    screens[name] = paint.texture("monitor-" + name + ctx.lang, 512, 320, (c, w, h) => {
      c.fillStyle = look.color;
      c.fillRect(0, 0, w, h);
      c.fillStyle = "rgba(255,255,255,0.16)";
      c.fillRect(0, 0, w, 64);
      c.fillStyle = "#ffffff";
      c.textAlign = "left";
      c.textBaseline = "middle";
      fitText(c, "#14 US-014", 24, 34, w - 48, 34, "700");
      glyph(c, look.glyph, w / 2, 150, 110, "#ffffff");
      c.textAlign = "center";
      fitText(c, t(look.key), w / 2, 262, w - 40, 50, "800");
    });
  }
  const screenTexture = screens.wait;
  const monitor = new THREE.Mesh(paint.geometry("monitor", () => new THREE.BoxGeometry(1.3, 0.82, 0.06)), [
    paint.plain(0x222222),
    paint.plain(0x222222),
    paint.plain(0x222222),
    paint.plain(0x222222),
    paint.plain(0xffffff, { map: screenTexture, emissive: 0xffffff, emissiveMap: screenTexture, emissiveIntensity: 0.6 }),
    paint.plain(0x222222)
  ]);
  const screenMaterial = monitor.material[4];
  // Above the monitor, the status of the check in 3D: it follows the screen
  const STATUS = { wait: "check-warn", fail: "check-fail", green: "check-pass", done: "pull-request", running: "check-warn", boss: "check-fail" };
  const statusItems = {};
  for (const [state, item] of Object.entries(STATUS)) {
    const thing = model(item, { height: 0.42, shadows: false }, 0.35, 1.98, -1.25);
    if (thing) {
      thing.visible = false;
      statusItems[state] = thing;
    }
  }
  let statusShown = null;
  let statusPop = 0;
  function setMonitor(name) {
    screenMaterial.map = screens[name];
    screenMaterial.emissiveMap = screens[name];
    screenMaterial.needsUpdate = true;
    if (statusShown) {
      statusShown.visible = false;
    }
    statusShown = statusItems[name] || null;
    if (statusShown) {
      statusShown.visible = true;
      statusPop = 0;
    }
  }
  monitor.position.set(0, 1.32, -1.25);
  monitor.rotation.y = 0;
  root.add(monitor);
  const stand = new THREE.Mesh(paint.geometry("stand", () => new THREE.BoxGeometry(0.1, 0.3, 0.1)), paint.plain(0x333333));
  stand.position.set(0, 0.95, -1.27);
  root.add(stand);
  const mug = new THREE.Mesh(paint.geometry("mug", () => new THREE.CylinderGeometry(0.08, 0.07, 0.16, 16)), paint.plain(0x0176d3));
  mug.position.set(0.85, 0.88, -0.75);
  root.add(mug);
  // The guinea pig on a chair, at the desk
  // Its back behind the guinea pig, which faces the desk (-Z)
  if (!model("chairDesk", { height: 1.15 }, 0, 0, 0.2, Math.PI)) {
    const chair = new THREE.Mesh(paint.geometry("chair", () => new THREE.CylinderGeometry(0.45, 0.45, 0.12, 24)), paint.plain(0x032d60));
    chair.position.set(0, 0.45, 0.1);
    root.add(chair);
  }
  pig.setSitting(true);
  // On the seat of the chair: lower for the Blender model, whose sit pose already lifts it
  const SEAT = ctx.models && ctx.models.has("chairDesk") ? 0.3 : 0.5;
  pig.object.position.set(0, SEAT, 0.1);
  pig.object.rotation.y = 0;
  pig.shadow.visible = false;

  /* ---------- The admin of the end, in 3D: beside the desk, the card he took in his hand ---------- */

  // Where he stands, behind the desk beside the monitor, and how big: a person next to a guinea pig.
  // He comes in from the side of the plant, and leaves the same way
  const ADMIN_HOME = { x: 0.75, z: -1.8 };
  const ADMIN_OFF = 2.9;
  const ADMIN_SCALE = 0.46;
  const FACE_Y = 2.9;
  const FACE_R = 0.8;

  /** A plain face on the canvas, kept if the portrait cannot load. */
  function drawPlainFace(c, size) {
    const r = size / 2;
    c.fillStyle = "#ffffff";
    c.beginPath();
    c.arc(r, r, r - 2, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#f2c9a0";
    c.beginPath();
    c.arc(r, r * 1.08, r * 0.62, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#5b3a29";
    c.beginPath();
    c.arc(r, r * 0.92, r * 0.64, Math.PI * 1.05, Math.PI * 1.95);
    c.fill();
    c.fillStyle = "#222222";
    for (const dx of [-0.22, 0.22]) {
      c.beginPath();
      c.arc(r + dx * r, r * 1.08, r * 0.07, 0, Math.PI * 2);
      c.fill();
    }
    c.strokeStyle = "#222222";
    c.lineWidth = r * 0.07;
    c.lineCap = "round";
    c.beginPath();
    c.arc(r, r * 1.2, r * 0.22, Math.PI * 0.2, Math.PI * 0.8);
    c.stroke();
  }

  const faceTexture = paint.texture("w3-boss-face", 256, 256, (c, w) => drawPlainFace(c, w));
  const faceMaterial = new THREE.MeshBasicMaterial({ map: faceTexture, alphaTest: 0.5, toneMapped: false });
  owned.push(faceMaterial);
  {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      if (disposed) {
        return;
      }
      // A white ring around the face, as on the cards
      const c = faceTexture.image.getContext("2d");
      const size = faceTexture.image.width;
      c.clearRect(0, 0, size, size);
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
      faceTexture.needsUpdate = true;
    };
    // A face that does not load keeps its plain drawing
    image.onerror = () => {};
    image.src = faceUrl;
  }

  const admin = (() => {
    const group = new THREE.Group();
    group.scale.setScalar(ADMIN_SCALE);
    group.visible = false;
    root.add(group);
    const limb = paint.geometry("w3-admin-limb", () => new THREE.CapsuleGeometry(0.13, 0.62, 4, 10).translate(0, -0.42, 0));
    const torso = paint.geometry("w3-admin-torso", () => new THREE.CapsuleGeometry(0.46, 0.55, 6, 14));
    const disc = paint.geometry("w3-admin-face", () => new THREE.CircleGeometry(FACE_R, 40));
    const paper = paint.geometry("w3-admin-paper", () => new THREE.BoxGeometry(0.62, 0.42, 0.04));
    const trousers = paint.plain(0x22325a, { roughness: 0.7 });
    const shirt = paint.plain(0xdd7a01, { roughness: 0.6 });
    const part = (geometry, material, x, y, z, parent) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      (parent || group).add(mesh);
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
    right.rotation.z = 0.25;
    const face = part(disc, faceMaterial, 0, FACE_Y, 0.4);
    face.renderOrder = 1;
    // The card he took, in his hand, in the colour of its type
    const held = part(paper, paint.plain(0xffffff), 0, -0.95, 0.18, right);
    held.visible = false;
    return { group, legs, left, right, face, held, x: ADMIN_OFF, reach: 0, flinch: 0, cheer: 0, heldType: "" };
  })();

  /**
   * The desk seen from the side, the guinea pig in profile facing its monitor.
   * The view is shifted so the scene sits beside the Pull Request panel: on
   * its left on a wide screen, above it on a phone.
   */
  function placeCamera(time) {
    const camera = ctx.camera;
    const portrait = ctx.engine.portrait;
    const sway = Math.sin(time * 0.3) * 0.12;
    if (portrait) {
      camera.position.set(4.2 + sway, 2.6, 2.4);
    } else {
      camera.position.set(4.8 + sway, 2.4, 1.8);
    }
    camera.lookAt(0, 0.85, -0.55);
    camera.fov = portrait ? 56 : 42;
    const canvas = ctx.engine.renderer.domElement;
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    const wide = w > 700;
    camera.setViewOffset(w, h, wide ? w * 0.22 : 0, wide ? 0 : h * 0.24, w, h);
    camera.updateProjectionMatrix();
    ctx.engine.aimSun(0, 0);
  }

  /* ---------- The Pull Request page, in HTML ---------- */

  const page = el("div", "gr-w3 gr-scroll", hud.layer);
  // The admin, once he comes: his face, his bar, what he says. It stays at the top while the panel scrolls
  const bossNode = el("div", "gr-w3-boss", page);
  bossNode.hidden = true;
  const bossFace = el("img", "", bossNode);
  bossFace.alt = "";
  bossFace.decoding = "async";
  bossFace.draggable = false;
  bossFace.onerror = () => {
    bossFace.onerror = null;
    bossFace.src = PLAIN_FACE;
  };
  bossFace.src = faceUrl;
  const bossMain = el("div", "gr-w3-boss-main", bossNode);
  const bossTop = el("div", "gr-w3-boss-top", bossMain);
  el("strong", "", bossTop, t("bossName"));
  const bossFill = el("b", "", el("i", "", bossTop));
  const bossSay = el("q", "", bossMain);
  const header = el("div", "gr-w3-head", page);
  el("span", "gr-w3-pr", header, "#14");
  el("strong", "", header, t("prTitle"));
  const steps = el("ol", "gr-w3-steps", page);
  const stepNodes = ["step1", "step2", "step3"].map((key, i) => {
    const node = el("li", "", steps, t(key));
    // A phone shows the step it is on; the others shrink to their number
    node.setAttribute("data-n", String(i + 1));
    return node;
  });
  const body = el("div", "gr-w3-body", page);
  // Victor's note hides at the end of the Pull Request template
  const template = el("details", "gr-w3-template", page);
  const summary = el("summary", "", template, t("templateShow"));
  summary.setAttribute("data-w3", "template");
  el("pre", "", template, "## What this changes\n\n## How to test\n\n" + t("templateLine"));
  template.addEventListener("toggle", () => {
    if (template.open && ctx.playing) {
      ctx.foundNote();
    }
  });

  /*
   * Below 1000 px the Pull Request takes the width of the screen, where the
   * toast and the tip of the shell appear: while one shows over its top or its
   * bottom, the panel makes room for it, so no card or column hides behind a
   * message. From 1000 px the messages sit over the desk (see CSS).
   */
  const overlayNode = hud.layer.parentElement;
  const messages = overlayNode ? [".gr-tipbar", ".gr-toast"].map((s) => overlayNode.querySelector(s)).filter(Boolean) : [];
  let room = { top: 0, bottom: 0 };
  function makeRoom() {
    let top = 0;
    let bottom = 0;
    if (!roomy.matches && !disposed) {
      const box = page.getBoundingClientRect();
      const panelTop = box.top - room.top;
      const panelBottom = box.bottom + room.bottom;
      for (const node of messages) {
        if (!node.classList.contains("is-shown") && !node.classList.contains("gr-toast--show")) {
          continue;
        }
        const r = node.getBoundingClientRect();
        if (!r.height || r.right < box.left || r.left > box.right) {
          continue;
        }
        // Measured before its slide in ends: a few pixels more
        if (r.top < panelTop + 160 && r.bottom > panelTop - 4) {
          top = Math.max(top, r.bottom - panelTop + 18);
        } else if (r.bottom > panelBottom - 160 && r.top < panelBottom + 4) {
          bottom = Math.max(bottom, panelBottom - r.top + 18);
        }
      }
    }
    if (top !== room.top || bottom !== room.bottom) {
      room = { top, bottom };
      page.style.marginTop = top ? top + "px" : "";
      page.style.marginBottom = bottom ? bottom + "px" : "";
    }
  }
  const watcher = window.MutationObserver ? new MutationObserver(makeRoom) : null;
  if (watcher) {
    for (const node of messages) {
      watcher.observe(node, { attributes: true, attributeFilter: ["class"] });
    }
  }

  let coached = -1;
  function setStep(index, n) {
    stepNodes.forEach((node, i) => {
      node.className = i < index ? "is-done" : i === index ? "is-current" : "";
    });
    ctx.setData("phase", phase);
    hud.goal(t("goal" + (index + 1), { n: (n || 0) + 1 }));
    if (coached !== index) {
      coached = index;
      hud.coach(t("coach" + (index + 1)));
    }
    setMonitor(index === 0 ? "wait" : index === 1 ? "fail" : "green");
  }

  function happy() {
    bounce = 0.5;
    ctx.sound.play("wheek");
    ctx.fx.burst(0, 1.6, -0.6, { count: 26, speed: 3, up: 4 });
  }

  function sad() {
    wobble = 0.6;
  }

  /** A question with its answers as buttons. onAnswer(answer) decides. */
  function renderChoices(question, error, answers, onAnswer) {
    body.replaceChildren();
    el("p", "gr-w3-question", body, question);
    if (error) {
      const box = el("div", "gr-w3-error", body);
      el("strong", "", box, t("checkFailed"));
      el("code", "", box, error);
    }
    const list = el("div", "gr-w3-answers", body);
    const buttons = answers.map((answer, i) => {
      const button = el("button", "gr-w3-answer", list, answer.text);
      button.type = "button";
      button.addEventListener("click", () => {
        choice = i;
        highlight();
        onAnswer(answer, button);
      });
      return button;
    });
    choice = 0;
    function highlight() {
      buttons.forEach((b, i) => b.classList.toggle("is-chosen", i === choice));
    }
    highlight();
    current = {
      move(step) {
        choice = (choice + step + buttons.length) % buttons.length;
        highlight();
      },
      confirm() {
        buttons[choice].click();
      }
    };
  }

  let current = null;

  /* ---------- Step 1: the base ---------- */

  function showBase() {
    phase = "base";
    setStep(0);
    const answers = [
      // In the order of the pipeline: the first one is the answer, and the lesson
      { text: t("baseIntegration"), ok: true },
      { text: t("baseUat"), tip: t("baseUatTip") },
      { text: t("basePreprod"), tip: t("basePreprodTip") },
      { text: t("baseMain"), tip: t("baseMainTip") }
    ];
    renderChoices(t("baseQuestion"), null, answers, (answer, button) => {
      if (answer.ok) {
        happy();
        ctx.collect(100, t("baseOk"));
        showQuestion(0);
      } else {
        sad();
        button.disabled = true;
        button.classList.add("is-wrong");
        ctx.loseAttempt(t("wrongShort"), answer.tip);
        if (ctx.playing) {
          hud.chat("mariia", t("mariiaBase"));
        }
      }
    });
  }

  /* ---------- Step 2: the deployment check ---------- */

  function showQuestion(index) {
    phase = "check";
    setStep(1, index);
    questionStart = elapsed;
    ctx.setData("fixed", index);
    const q = QUESTIONS[index];
    // The right answer is never in the same place twice
    const answers = q.answers.map((a) => ({ text: t(a.key), ok: a.ok, tip: a.tip ? t(a.tip) : "" })).sort(() => ctx.random() - 0.5);
    renderChoices(t(q.id), q.error, answers, (answer, button) => {
      if (answer.ok) {
        happy();
        // Faster is worth more: up to 3 times the points
        const fast = Math.max(0, 1 - (elapsed - questionStart) / 20);
        ctx.collect(Math.round(100 + 200 * fast), t(q.lesson));
        if (index + 1 < QUESTIONS.length) {
          showQuestion(index + 1);
        } else {
          ctx.setData("fixed", QUESTIONS.length);
          hud.toast(t("checkGreen"), "good");
          showActions();
        }
      } else {
        sad();
        button.disabled = true;
        button.classList.add("is-wrong");
        ctx.loseAttempt(t("wrongShort"), answer.tip);
      }
    });
  }

  /* ---------- Step 3: the deployment actions ---------- */

  const decoy = { id: "decoy", type: "decoy", label: "" };
  let hand = [];
  let before = [];
  let after = [];
  let binned = [];
  let selected = 0;

  // On a phone, Mariia's line sits in the board until the first card is placed: a chat bubble there would hide the cards
  let mariiaInline = false;

  function showActions() {
    phase = "actions";
    setStep(2);
    mariiaInline = narrow.matches;
    if (!mariiaInline) {
      hud.chat("mariia", t("mariiaPlan"), 6000);
    }
    decoy.label = t("decoy");
    hand = DEPLOYMENT_ACTIONS.concat([decoy]).sort(() => ctx.random() - 0.5);
    before = [];
    after = [];
    binned = [];
    selected = 0;
    renderBoard();
  }

  function cardNode(action, parent, index, where) {
    const card = el("button", "gr-w3-card", parent);
    card.type = "button";
    card.addEventListener("pointerdown", (event) => startDrag(event, action, card));
    card.addEventListener(
      "click",
      (event) => {
        // The click that ends a drag is not a tap
        if (dragJustEnded) {
          event.stopImmediatePropagation();
          event.preventDefault();
        }
      },
      true
    );
    card.style.setProperty("--gr-w3-type", TYPE_COLORS[action.type]);
    el("span", "gr-w3-type", card, action.type === "decoy" ? "?" : action.type);
    el("span", "gr-w3-label", card, action.label);
    if (where === "hand") {
      card.classList.toggle("is-chosen", index === selected);
      card.addEventListener("click", () => {
        selected = index;
        renderBoard();
        // A phone shows the choice on the card itself: a toast there would sit on the board
        if (!narrow.matches) {
          hud.toast(t("selected", { label: action.label }), "power");
        }
      });
    } else {
      // A placed card goes back to the hand when tapped
      card.addEventListener("click", () => {
        before = before.filter((a) => a !== action);
        after = after.filter((a) => a !== action);
        binned = binned.filter((a) => a !== action);
        hand.push(action);
        selected = hand.length - 1;
        renderBoard();
      });
    }
    return card;
  }

  function renderBoard() {
    body.replaceChildren();
    el("p", "gr-w3-question", body, t("actionsTitle"));
    el("p", "gr-w3-hint", body, t("actionsHint"));
    el("p", "gr-w3-keys", body, t("actionsKeys"));
    if (mariiaInline && hand.length === DEPLOYMENT_ACTIONS.length + 1) {
      const line = el("div", "gr-w3-mariia", body);
      el("span", "gr-avatar gr-avatar--mariia", line);
      el("span", "", line, t("mariiaPlan"));
    }
    const handRow = el("div", "gr-w3-hand", body);
    handRow.setAttribute("data-drop", "hand");
    hand.forEach((action, i) => cardNode(action, handRow, i, "hand"));
    const board = el("div", "gr-w3-board", body);
    const column = (title, list, where) => {
      const col = el("div", "gr-w3-col gr-w3-col--" + where, board);
      col.setAttribute("data-drop", where);
      const head = el("button", "gr-w3-col-head", col, title);
      head.type = "button";
      head.addEventListener("click", () => place(where));
      list.forEach((action, i) => {
        const row = el("div", "gr-w3-slot", col);
        el("span", "gr-w3-order", row, String(i + 1));
        cardNode(action, row, i, where);
      });
      return col;
    };
    column(t("before"), before, "before");
    el("div", "gr-w3-deploy", board, t("deployment"));
    column(t("after"), after, "after");
    column(t("bin"), binned, "bin");
    const actions = el("div", "gr-w3-buttons", body);
    const reset = el("button", "gr-button", actions, t("reset"));
    reset.type = "button";
    reset.addEventListener("click", showActions);
    const commit = el("button", "gr-button gr-primary", actions, t("commit"));
    commit.type = "button";
    commit.setAttribute("data-w3", "commit");
    commit.disabled = hand.length > 0;
    commit.addEventListener("click", commitPlan);
    ctx.setData("plan", "pre:" + before.map((a) => a.id).join(",") + "|post:" + after.map((a) => a.id).join(",") + "|bin:" + binned.map((a) => a.id).join(","));
    current = {
      move(step) {
        if (hand.length) {
          selected = (selected + step + hand.length) % hand.length;
          renderBoard();
        }
      },
      confirm() {
        if (hand.length) {
          place("bin");
        } else {
          commitPlan();
        }
      }
    };
  }

  /* ---------- Drag and drop, with a mouse or a finger ---------- */

  const DRAG_START_PX = 6;
  let drag = null;
  let dragJustEnded = false;

  function listOf(where) {
    return where === "before" ? before : where === "after" ? after : where === "bin" ? binned : hand;
  }

  /** action: a card of the board, or "base" for the base branch the admin switched (his fight only). */
  function startDrag(event, action, card) {
    if (finished || event.button > 0) {
      return;
    }
    // A drag left behind (a second finger, a lost pointer) ends here
    finishDrag();
    drag = { action, card, x: event.clientX, y: event.clientY, id: event.pointerId, ghost: null, zone: null };
    card.setPointerCapture(event.pointerId);
    card.addEventListener("pointermove", moveDrag);
    card.addEventListener("pointerup", endDrag);
    card.addEventListener("pointercancel", cancelDrag);
  }

  function moveDrag(event) {
    if (!drag || event.pointerId !== drag.id) {
      return;
    }
    if (!drag.ghost) {
      if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < DRAG_START_PX) {
        return;
      }
      // A copy of the card follows the pointer; the card itself fades in place
      const box = drag.card.getBoundingClientRect();
      drag.ghost = drag.card.cloneNode(true);
      drag.ghost.classList.add("gr-w3-ghost");
      drag.ghost.style.width = box.width + "px";
      drag.dx = drag.x - box.left;
      drag.dy = drag.y - box.top;
      (drag.card.closest(".guinea-run") || document.body).appendChild(drag.ghost);
      drag.card.classList.add("is-dragging");
      ctx.sound.play("click");
    }
    event.preventDefault();
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    drag.ghost.style.transform = "translate(" + (event.clientX - drag.dx) + "px, " + (event.clientY - drag.dy) + "px) rotate(-2deg)";
    if (!drag.scrolling) {
      drag.scrolling = true;
      window.requestAnimationFrame(autoScroll);
    }
    refreshZone(event.clientX, event.clientY);
  }

  /** Near the top or the bottom edge of the panel, it scrolls: on a phone the columns are below the hand. */
  function autoScroll() {
    if (!drag || !drag.ghost) {
      return;
    }
    const box = page.getBoundingClientRect();
    const edge = 40;
    let step = 0;
    if (drag.lastY > box.bottom - edge) {
      step = Math.min(12, (drag.lastY - (box.bottom - edge)) / 3);
    } else if (drag.lastY < box.top + edge) {
      step = -Math.min(12, (box.top + edge - drag.lastY) / 3);
    }
    if (step) {
      page.scrollTop += step;
      refreshZone(drag.lastX, drag.lastY);
    }
    window.requestAnimationFrame(autoScroll);
  }

  function refreshZone(x, y) {
    const under = document.elementFromPoint(x, y);
    const zone = under && under.closest ? under.closest("[data-drop]") : null;
    if (zone !== drag.zone) {
      if (drag.zone) {
        drag.zone.classList.remove("is-over");
      }
      drag.zone = zone;
      if (zone) {
        zone.classList.add("is-over");
      }
    }
  }

  /** Where in a column the card lands: before the first slot whose middle is below the pointer. */
  function dropIndex(zone, y) {
    const slots = Array.from(zone.querySelectorAll(".gr-w3-slot, .gr-w3-hand > .gr-w3-card"));
    const index = slots.findIndex((slot) => {
      const box = slot.getBoundingClientRect();
      return y < box.top + box.height / 2;
    });
    return index < 0 ? slots.length : index;
  }

  function endDrag(event) {
    if (!drag || event.pointerId !== drag.id) {
      return;
    }
    const { action, ghost, zone } = drag;
    finishDrag();
    if (!ghost) {
      // No movement: a tap, handled by the click as before
      return;
    }
    dragJustEnded = true;
    // Long enough for the click a browser may send after the drop, on what is now under the finger
    window.setTimeout(() => {
      dragJustEnded = false;
    }, 400);
    if (phase === "boss") {
      bossDrop(action, zone ? zone.getAttribute("data-drop") : "");
      return;
    }
    if (!zone) {
      renderBoard();
      return;
    }
    const where = zone.getAttribute("data-drop");
    let index = dropIndex(zone, event.clientY);
    // Out of its list first; a move down the same list shifts the target by one
    for (const name of ["hand", "before", "after", "bin"]) {
      const list = listOf(name);
      const at = list.indexOf(action);
      if (at >= 0) {
        list.splice(at, 1);
        if (name === where && at < index) {
          index -= 1;
        }
      }
    }
    listOf(where).splice(index, 0, action);
    selected = Math.min(selected, Math.max(0, hand.length - 1));
    ctx.sound.play("pickup");
    renderBoard();
  }

  function cancelDrag() {
    finishDrag();
    if (phase === "boss") {
      renderBoss();
    } else {
      renderBoard();
    }
  }

  function finishDrag() {
    if (!drag) {
      return;
    }
    drag.card.removeEventListener("pointermove", moveDrag);
    drag.card.removeEventListener("pointerup", endDrag);
    drag.card.removeEventListener("pointercancel", cancelDrag);
    if (drag.ghost) {
      drag.ghost.remove();
    }
    if (drag.zone) {
      drag.zone.classList.remove("is-over");
    }
    drag = null;
  }

  function place(where) {
    if (!hand.length) {
      return;
    }
    const action = hand.splice(Math.min(selected, hand.length - 1), 1)[0];
    (where === "before" ? before : where === "after" ? after : binned).push(action);
    selected = Math.min(selected, Math.max(0, hand.length - 1));
    ctx.sound.play("click");
    renderBoard();
  }

  function commitPlan() {
    if (hand.length) {
      hud.toast(t("planMissing"), "bad");
      return;
    }
    const plan = { pre: before.filter((a) => a.id !== "decoy").map((a) => a.id), post: after.filter((a) => a.id !== "decoy").map((a) => a.id) };
    ctx.savePlan(plan);
    const verdict = ctx.judgePlan();
    const mistakes = [];
    for (const action of DEPLOYMENT_ACTIONS) {
      const v = verdict[action.id];
      if (binned.includes(action)) {
        mistakes.push({ action, text: t("wrongDeclared", { label: action.label }) });
      } else if (!v.ok) {
        if (action.when === "post" && before.includes(action)) {
          mistakes.push({ action, text: t("wrongPre", { label: action.label }) });
        } else if (action.when === "pre" && after.includes(action)) {
          mistakes.push({ action, text: t("wrongPost", { label: action.label }) });
        } else {
          mistakes.push({ action, text: t("wrongOrder") });
        }
      }
    }
    if (!binned.includes(decoy)) {
      mistakes.push({ action: decoy, text: t("wrongDecoy", { label: decoy.label }) + " " + t("decoyTip") });
    }
    if (!mistakes.length) {
      happy();
      ctx.collect(300, t("planSaved"));
      // Committed: now the admin who does it all by hand comes for it
      startBoss("", 200);
      return;
    }
    sad();
    // Show which cards are wrong, and let the player fix them
    for (const node of body.querySelectorAll(".gr-w3-card")) {
      const label = node.querySelector(".gr-w3-label").textContent;
      if (mistakes.some((m) => m.action.label === label)) {
        node.classList.add("is-wrong");
      }
    }
    planTries += 1;
    if (planTries >= 2) {
      hud.toast(t("planWrong"), "bad");
      // Committed as it is: the admin fights over the plan the player declared
      startBoss(t("planKept", { mistakes: mistakes.map((m) => m.action.label).join(", ") }), 0);
      return;
    }
    // The toast says it is committed wrong, the tip says why
    ctx.loseAttempt(t("planWrong"), mistakes[0].text);
  }

  /* ---------- Step 4: the "I'll do it by hand after" admin ---------- */

  // stolen: the cards in his hands, each with its timer; baseTaken: the base he
  // switched to main, with its timer; aim: the move he is about to make
  const boss = { state: "away", hp: BOSS_HP, clock: 0, next: 0, script: 0, ease: 0, angry: false, taken: 0, leave: 0, info: "", bonus: 0, autoplay: false };
  let stolen = [];
  let baseTaken = null;
  let aim = null;
  let chosen = null;
  let monitorState = "";
  let baseTimerNode = null;
  let baseTimerBar = null;
  let baseTimerText = null;

  // The check plays the admin by itself (window.__guineaRun only exists for checks)
  if (window.__guineaRun) {
    window.__guineaRun.w3 = {
      autoplay(on) {
        boss.autoplay = on !== false;
      }
    };
  }

  function startBoss(info, bonus) {
    phase = "boss";
    ctx.setData("phase", "boss");
    Object.assign(boss, { state: "arriving", hp: BOSS_HP, clock: 0, next: 0.5, script: 0, ease: 0, angry: false, taken: 0, leave: 0, info: info || "", bonus: bonus || 0 });
    stolen = [];
    baseTaken = null;
    aim = null;
    chosen = null;
    hand = [];
    // A player who lost hearts on the way meets him with one back
    if (ctx.attempts < 3) {
      ctx.gainAttempt();
    }
    bossNode.hidden = false;
    bossNode.classList.remove("is-angry", "is-beaten");
    renderBossBar();
    say(t("bossIn"));
    // A phone keeps its top for the board: what to do is in the board itself
    hud.goal(narrow.matches ? "" : t("goalBoss"));
    if (roomy.matches) {
      hud.coach(t("coachBoss"), 2600);
    }
    ctx.sound.play("bossIn");
    ctx.setData("boss", "arriving");
    ctx.setData("boss-hp", boss.hp);
    ctx.setData("taken", 0);
    ctx.setData("pace", "1.10");
    admin.group.visible = true;
    admin.x = ADMIN_OFF;
    page.scrollTop = 0;
    updateBossMonitor();
    renderBoss();
  }

  /** The plan as committed, back on the board: a try that starts at the admin. */
  function boardFromPlan() {
    const plan = ctx.plan || { pre: ["deliverability"], post: ["backfill", "refdata", "schedule"] };
    const byId = (id) => DEPLOYMENT_ACTIONS.find((a) => a.id === id);
    decoy.label = t("decoy");
    before = (plan.pre || []).map(byId).filter(Boolean);
    after = (plan.post || []).map(byId).filter(Boolean);
    binned = DEPLOYMENT_ACTIONS.filter((a) => !before.includes(a) && !after.includes(a)).concat([decoy]);
    hand = [];
  }

  function renderBossBar() {
    bossFill.style.width = Math.round((100 * boss.hp) / BOSS_HP) + "%";
    ctx.setData("boss-hp", boss.hp);
  }

  // What he says, in his strip (two lines kept for it, so nothing below moves)
  const sayKeeper = lineKeeper();

  /** His line: a quip at a hit never cuts a line still being read, a new line waits its turn. */
  function say(text, reaction) {
    sayKeeper.say(text, reaction, () => {
      bossSay.textContent = text;
    });
  }

  function updateBossMonitor() {
    const wanted = boss.state === "beaten" ? "green" : stolen.length || baseTaken ? "boss" : "running";
    if (wanted !== monitorState) {
      monitorState = wanted;
      setMonitor(wanted);
    }
  }

  /** Where a declared card sits: "before", "after", or "" (the bin, or the hand). */
  function columnOf(action) {
    return before.includes(action) ? "before" : after.includes(action) ? "after" : "";
  }

  function renderBoss() {
    // A card under a moving finger is never redrawn (he holds still meanwhile); a press that has not moved yet is let go
    if (drag && drag.ghost) {
      return;
    }
    finishDrag();
    body.replaceChildren();
    baseTimerNode = baseTimerBar = baseTimerText = null;
    if (boss.state === "beaten") {
      const green = el("div", "gr-w3-green", body);
      el("strong", "", green, t("checkGreen"));
      el("span", "", green, t("bossLesson"));
    }
    // The base of the Pull Request, the branches in the order of the pipeline
    const baseRow = el("div", "gr-w3-baserow", body);
    el("span", "gr-w3-baselabel", baseRow, t("baseLabel"));
    const chips = el("div", "gr-w3-branches", baseRow);
    const base = baseTaken ? "main" : "integration";
    for (const name of BRANCHES) {
      const chip = el("button", "gr-w3-branch", chips, name);
      chip.type = "button";
      chip.setAttribute("data-drop", "base-" + name);
      chip.classList.toggle("is-base", base === name);
      if (baseTaken && name === "main") {
        chip.classList.add("is-taken");
        chip.addEventListener("pointerdown", (event) => startDrag(event, "base", chip));
      }
      if (baseTaken && name === "integration") {
        chip.classList.add("is-home");
      }
      if (aim && aim.kind === "base" && name === "main") {
        chip.classList.add("is-aimed");
        grabber(chip);
      }
      chip.addEventListener("click", () => {
        if (!dragJustEnded && name !== base) {
          bossDrop("base", "base-" + name);
        }
      });
    }
    baseTimerNode = el("div", "gr-w3-basetimer", baseRow);
    if (baseTaken) {
      baseTimerNode.classList.add("is-on");
      baseTimerBar = el("i", "", el("span", "gr-w3-timer", baseTimerNode));
      baseTimerText = el("span", "gr-w3-timer-text", baseTimerNode);
      baseTaken.shown = -1;
    }
    // His list: what he took, each with the time before he does it by hand (gone with him)
    const tray = el("div", "gr-w3-tray", boss.state === "beaten" ? null : body);
    el("p", "gr-w3-tray-head", tray, t("bossTray"));
    const trayCards = el("div", "gr-w3-tray-cards", tray);
    if (!stolen.length) {
      el("p", "gr-w3-tray-empty", trayCards, t("bossTrayEmpty"));
    }
    for (const s of stolen) {
      const card = el("button", "gr-w3-card gr-w3-stolen", trayCards);
      card.type = "button";
      card.style.setProperty("--gr-w3-type", TYPE_COLORS[s.action.type]);
      card.classList.toggle("is-chosen", s === chosen && stolen.length > 1);
      // His timer first, then what it is: the colour on its edge matches its hole in the column
      s.text = el("span", "gr-w3-timer-text", card);
      el("span", "gr-w3-label", card, s.action.label);
      s.bar = el("i", "", el("span", "gr-w3-timer", card));
      s.shown = -1;
      card.addEventListener("pointerdown", (event) => startDrag(event, s.action, card));
      card.addEventListener("click", () => {
        if (dragJustEnded) {
          return;
        }
        chosen = s;
        renderBoss();
      });
    }
    // The plan as declared: a dashed hole where he took a card
    const board = el("div", "gr-w3-board gr-w3-board--boss", body);
    for (const where of ["before", "after"]) {
      const col = el("div", "gr-w3-col gr-w3-col--" + where, board);
      col.setAttribute("data-drop", where);
      el("div", "gr-w3-col-head", col, t(where));
      col.addEventListener("click", () => {
        if (!dragJustEnded && chosen) {
          bossDrop(chosen.action, where);
        }
      });
      listOf(where).forEach((action, i) => {
        const row = el("div", "gr-w3-slot", col);
        el("span", "gr-w3-order", row, String(i + 1));
        const out = stolen.some((s) => s.action === action);
        const card = el("div", out ? "gr-w3-card gr-w3-hole" : "gr-w3-card gr-w3-card--locked", row);
        card.style.setProperty("--gr-w3-type", TYPE_COLORS[action.type]);
        el("span", "gr-w3-type", card, action.type === "decoy" ? "?" : action.type);
        el("span", "gr-w3-label", card, action.label);
        if (aim && aim.action === action) {
          card.classList.add("is-aimed");
          grabber(card);
        }
      });
    }
    if (boss.state !== "beaten") {
      el("p", "gr-w3-keys gr-w3-keys--boss", body, t(hud.touch ? "bossTouch" : "bossKeys"));
    }
    // A drag that scrolled the panel leaves the base under his strip: back to the top, where it all fits
    if (page.scrollTop > 0 && baseRow.getBoundingClientRect().top < bossNode.getBoundingClientRect().bottom) {
      page.scrollTop = 0;
    }
    tickBoss(0);
    current = {
      move(step) {
        if (stolen.length > 1) {
          chosen = stolen[(stolen.indexOf(chosen) + step + stolen.length) % stolen.length];
          renderBoss();
        }
      },
      confirm() {
        if (baseTaken) {
          bossDrop("base", "base-integration");
        }
      }
    };
  }

  /** His small face on what he is about to take. */
  function grabber(node) {
    const face = el("img", "gr-w3-grabber", node);
    face.alt = "";
    face.draggable = false;
    face.src = bossFace.src;
  }

  /** A card or the base, dropped (or tapped) somewhere during his fight. */
  function bossDrop(item, where) {
    if (boss.state !== "fight") {
      renderBoss();
      return;
    }
    if (item === "base") {
      if (!baseTaken) {
        renderBoss();
      } else if (where === "base-integration") {
        putBaseBack(true);
      } else if (where === "base-uat" || where === "base-preprod") {
        sad();
        ctx.sound.play("wrong");
        bossTip(t(where === "base-uat" ? "baseUatTip" : "basePreprodTip"));
        renderBoss();
      } else {
        renderBoss();
      }
      return;
    }
    const s = stolen.find((x) => x.action === item);
    if (!s) {
      renderBoss();
      return;
    }
    const from = columnOf(s.action);
    if (where === from) {
      putCardBack(s, true);
    } else if (where === "before" || where === "after") {
      // Not where it was declared: no heart lost, his timer keeps running
      sad();
      ctx.sound.play("wrong");
      chosen = s;
      bossTip(t("wrongColumn", { label: s.action.label, where: t(from) }));
      renderBoss();
    } else {
      renderBoss();
    }
  }

  function putCardBack(s, byPlayer) {
    stolen.splice(stolen.indexOf(s), 1);
    if (chosen === s || !stolen.includes(chosen)) {
      chosen = stolen[0] || null;
    }
    if (byPlayer) {
      hitBoss(s, t("hit" + (1 + Math.floor(ctx.random() * 4))));
    }
    ctx.setData("stolen", stolen.length + (baseTaken ? 1 : 0));
    updateBossMonitor();
    renderBoss();
  }

  function putBaseBack(byPlayer) {
    const s = baseTaken;
    baseTaken = null;
    if (byPlayer) {
      hitBoss(s, t("hitBase"));
    }
    ctx.setData("stolen", stolen.length);
    updateBossMonitor();
    renderBoss();
  }

  /** A move undone by the player: a bite out of his bar, more points the faster it was. */
  function hitBoss(s, line) {
    boss.hp = Math.max(0, boss.hp - 1);
    happy();
    ctx.collect(Math.round(80 + (120 * Math.max(0, s.left)) / s.total));
    ctx.sound.play("bossHit");
    admin.flinch = 0.45;
    bossNode.classList.remove("is-hit");
    void bossNode.offsetWidth;
    bossNode.classList.add("is-hit");
    say(line, true);
    if (!boss.angry && boss.hp <= BOSS_HP / 2 && boss.hp > 0) {
      boss.angry = true;
      bossNode.classList.add("is-angry");
      say(t("bossAngry"));
      ctx.setData("pace", "1.22");
    }
    if (boss.hp <= 0) {
      // Out of moves: what he still holds goes back, then the check runs green
      aim = null;
    }
    renderBossBar();
    boss.next = Math.max(boss.next, MOVE_GAP);
  }

  /** His next move: the script first, then at random, never what he already holds. */
  function startMove() {
    const free = before.concat(after).filter((a) => a.id !== "decoy" && !stolen.some((s) => s.action === a));
    let move = boss.script < BOSS_SCRIPT.length ? BOSS_SCRIPT[boss.script] : ctx.random() < 0.25 ? "base" : "card";
    boss.script += 1;
    if (move === "base" && baseTaken) {
      move = "card";
    }
    let action = null;
    if (move !== "base") {
      action = free.find((a) => a.id === move) || free[Math.floor(ctx.random() * free.length)] || null;
      if (!action) {
        if (baseTaken) {
          // Nothing left to take: he tries again in a moment
          boss.next = MOVE_GAP;
          return;
        }
        move = "base";
      }
    }
    aim = { kind: move === "base" ? "base" : "card", action, left: WINDUP };
    ctx.sound.play("click");
    renderBoss();
  }

  /** The move he aimed at: the card leaves its column for his list, or the base goes to main. */
  function makeMove() {
    const total = (boss.angry ? STEAL_TIME_ANGRY : STEAL_TIME) + boss.ease;
    if (aim.kind === "base") {
      baseTaken = { left: total, total, age: 0, shown: -1 };
      say(t("grabBase"));
      if (roomy.matches) {
        hud.coach(t("coachBase"), 2200);
      }
    } else {
      const s = { action: aim.action, left: total, total, age: 0, shown: -1 };
      stolen.push(s);
      if (!chosen) {
        chosen = s;
      }
      say(t("grab_" + aim.action.id));
    }
    aim = null;
    boss.taken += 1;
    boss.next = MOVE_GAP;
    admin.reach = 1;
    ctx.sound.play("w3Grab");
    ctx.setData("taken", boss.taken);
    ctx.setData("stolen", stolen.length + (baseTaken ? 1 : 0));
    updateBossMonitor();
    renderBoss();
  }

  /** His timer ran out: he did it by hand, in one org. A heart, and it is declared again. */
  function timeUp(s) {
    if (s === baseTaken) {
      baseTaken = null;
      loseAtBoss(t("lostBase"), t("lostBaseTip"));
    } else {
      stolen.splice(stolen.indexOf(s), 1);
      if (!stolen.includes(chosen)) {
        chosen = stolen[0] || null;
      }
      loseAtBoss(t("lostAction"), t("lostActionTip"));
    }
    say(t("bossDone"));
    sad();
    boss.ease = Math.min(EASE_MAX, boss.ease + EASE_PER_LOSS);
    boss.next = Math.max(boss.next, MOVE_GAP_AFTER_LOSS);
    ctx.setData("stolen", stolen.length + (baseTaken ? 1 : 0));
    updateBossMonitor();
    renderBoss();
  }

  /** The last heart lost at the admin: the result card says the next try starts at him. */
  function loseAtBoss(title, tip) {
    const last = ctx.attempts <= 1;
    ctx.loseAttempt(title, last ? tip + " " + t("retryHint") : tip);
    if (!ctx.playing) {
      bossRetry = { at: Date.now(), info: boss.info, bonus: boss.bonus };
    } else {
      // Long enough to read; he waits meanwhile (see updateBoss)
      hud.tip(tip, BOSS_TIP_MS, title);
    }
  }

  /** Why that was wrong, during his fight: he makes no new move while it shows. */
  function bossTip(text) {
    hud.tip(text, BOSS_TIP_MS, t("wrongShort"));
  }

  function tipShown() {
    return Boolean(messages[0] && messages[0].classList.contains("is-shown"));
  }

  function beatBoss() {
    ctx.bossBeaten();
    boss.state = "beaten";
    boss.leave = 0;
    bossRetry = null;
    ctx.setData("bosstime", Math.round(boss.clock));
    ctx.setData("boss", "beaten");
    ctx.setData("pace", "1.00");
    bossNode.classList.remove("is-angry");
    bossNode.classList.add("is-beaten");
    say(t("bossBeaten"));
    ctx.sound.play("bossDown");
    ctx.collect(400, t("bossLesson"));
    ctx.fx.burst(0, 1.8, -0.8, { count: 60, speed: 4, up: 5, life: 1.4 });
    admin.cheer = 1;
    updateBossMonitor();
    hud.goal(narrow.matches ? "" : t("checkGreen"));
    renderBoss();
    page.scrollTop = 0;
  }

  /** His fight, each step of the frame. */
  function updateBoss(dt) {
    if (boss.state === "away") {
      return;
    }
    boss.clock += dt;
    if (boss.state === "arriving") {
      if (boss.clock >= ARRIVAL) {
        boss.state = "fight";
        ctx.bossStarted();
        ctx.setData("boss", "fight");
      }
      return;
    }
    if (boss.state === "beaten") {
      boss.leave += dt;
      if (boss.leave >= LEAVING && !finished) {
        finished = true;
        ctx.setData("phase", "done");
        setMonitor("done");
        ctx.finish(boss.bonus, boss.info || undefined);
      }
      return;
    }
    // A card on its way under a finger holds him: nothing moves under it, nothing runs out
    const holding = Boolean(drag && drag.ghost);
    for (let i = 0; i < stolen.length; i++) {
      if (runTimer(stolen[i], dt, holding)) {
        return;
      }
    }
    if (baseTaken && runTimer(baseTaken, dt, holding)) {
      return;
    }
    // The check's autoplay puts each thing back a moment after he took it
    if (boss.autoplay && !holding) {
      if (baseTaken && baseTaken.age > 0.7) {
        bossDrop("base", "base-integration");
        return;
      }
      const s = stolen.find((x) => x.age > 0.7);
      if (s) {
        bossDrop(s.action, columnOf(s.action));
        return;
      }
    }
    if (aim) {
      aim.left -= dt;
      if (aim.left <= 0 && !holding) {
        makeMove();
      }
    } else if (boss.hp > 0) {
      // One thing at a time, two once he is angry
      const pending = stolen.length + (baseTaken ? 1 : 0);
      // While a tip says why, he waits: it is read, not raced
      if (pending < (boss.angry ? 2 : 1) && !tipShown()) {
        boss.next -= dt;
        if (boss.next <= 0 && !holding) {
          startMove();
        }
      }
    } else if (!stolen.length && !baseTaken) {
      beatBoss();
      return;
    }
    tickBoss(dt);
  }

  /** One of his timers, a step on: true when it ran out (and the board changed). */
  function runTimer(s, dt, holding) {
    s.age += dt;
    const whole = Math.ceil(s.left);
    s.left -= dt;
    if (s.left > 0 && s.left <= TICK_FROM && Math.ceil(s.left) < whole) {
      ctx.sound.play("w3Tick");
    }
    if (s.left > 0) {
      return false;
    }
    if (holding) {
      s.left = 0.05;
      return false;
    }
    timeUp(s);
    return true;
  }

  /** The timers on screen: a bar and the seconds, the text only when a second goes. */
  function tickBoss() {
    for (const s of stolen) {
      if (s.bar) {
        s.bar.style.width = Math.max(0, (100 * s.left) / s.total).toFixed(1) + "%";
        const n = Math.max(0, Math.ceil(s.left));
        if (n !== s.shown) {
          s.shown = n;
          s.text.textContent = t("manualIn", { s: n });
          s.text.parentElement.classList.toggle("is-late", n <= TICK_FROM);
        }
      }
    }
    if (baseTaken && baseTimerBar) {
      baseTimerBar.style.width = Math.max(0, (100 * baseTaken.left) / baseTaken.total).toFixed(1) + "%";
      const n = Math.max(0, Math.ceil(baseTaken.left));
      if (n !== baseTaken.shown) {
        baseTaken.shown = n;
        baseTimerText.textContent = t("mergeIn", { s: n });
        baseTimerNode.classList.toggle("is-late", n <= TICK_FROM);
      }
    }
  }

  /** The admin in 3D: he walks in, reaches for the desk when he takes something, slumps when hit, leaves when beaten. */
  function updateAdmin(dt, time) {
    const a = admin;
    if (!a.group.visible) {
      return;
    }
    const target = boss.state === "beaten" && boss.leave > 1.3 ? ADMIN_OFF + 0.6 : ADMIN_HOME.x;
    const speed = boss.state === "beaten" ? 1.6 : 2.4;
    const step = Math.max(-speed * dt, Math.min(speed * dt, target - a.x));
    a.x += step;
    const walking = Math.abs(step) > 1e-4;
    const z = ADMIN_HOME.z;
    a.group.position.set(a.x, walking ? Math.abs(Math.sin(time * 9)) * 0.03 : 0, z);
    // He looks at the camera, and turns to the desk to reach for it
    const camera = ctx.camera.position;
    const toCamera = Math.atan2(camera.x - a.x, camera.z - z);
    const toDesk = Math.atan2(-a.x, -0.9 - z);
    const reaching = aim ? 1 : a.reach;
    a.group.rotation.y = toCamera + (toDesk - toCamera) * 0.35 * reaching;
    a.legs[0].rotation.x = walking ? Math.sin(time * 9) * 0.5 : 0;
    a.legs[1].rotation.x = walking ? -Math.sin(time * 9) * 0.5 : 0;
    a.reach = Math.max(0, a.reach - dt * 1.4);
    a.flinch = Math.max(0, a.flinch - dt);
    a.cheer = Math.max(0, a.cheer - dt * 0.4);
    // Aiming: his hand hovers over the desk; holding: the card in his raised hand
    const holdingCard = stolen.length > 0;
    const shake = aim ? Math.sin(time * 16) * 0.12 : 0;
    a.right.rotation.x = -(aim ? 1.3 + shake : holdingCard ? 0.9 : 0) - a.reach * 0.6;
    a.right.rotation.z = 0.25 + (boss.state === "beaten" ? 2.4 * Math.min(1, boss.leave * 2) : 0);
    a.left.rotation.z = -0.25 - (boss.state === "beaten" ? 2.4 * Math.min(1, boss.leave * 2) : 0);
    a.held.visible = holdingCard;
    if (holdingCard && a.heldType !== stolen[0].action.type) {
      a.heldType = stolen[0].action.type;
      a.held.material = paint.plain(TYPE_COLORS[a.heldType]);
    }
    const squash = a.flinch > 0 ? 1 - Math.sin((a.flinch / 0.45) * Math.PI) * 0.12 : 1;
    a.group.scale.set(ADMIN_SCALE * (2 - squash), ADMIN_SCALE * squash, ADMIN_SCALE);
    a.face.rotation.z = a.flinch > 0 ? Math.sin(time * 30) * 0.15 : boss.angry && boss.state === "fight" ? Math.sin(time * 6) * 0.06 : 0;
    if (boss.state === "beaten" && a.x >= ADMIN_OFF + 0.55) {
      a.group.visible = false;
    }
  }

  showBase();
  placeCamera(0);

  return {
    start() {
      // guinea-at (a check setting): 2 the deployment check, 3 the deployment actions, 4 the admin
      const at = ctx.params.startAt;
      const retry = !at && bossRetry && Date.now() - bossRetry.at < BOSS_RETRY_MS;
      if (at === 2) {
        showQuestion(0);
      } else if (at === 3) {
        showActions();
      } else if (at >= 4 || retry) {
        const { info, bonus } = retry ? bossRetry : { info: "", bonus: 200 };
        bossRetry = null;
        boardFromPlan();
        ctx.setData("fixed", QUESTIONS.length);
        phase = "actions";
        // Steps 1 to 3 are behind: no coach line for them
        coached = 2;
        setStep(2);
        startBoss(info, bonus);
        if (retry) {
          // A little easier too, as after any lost heart
          boss.ease = EASE_PER_LOSS;
          hud.toast(t("retryBoss"), "power");
        }
      }
    },
    update(dt, time) {
      elapsed += dt;
      placeCamera(time);
      updateBoss(dt);
      updateAdmin(dt, time);
      bounce = Math.max(0, bounce - dt);
      wobble = Math.max(0, wobble - dt);
      pig.object.position.y = SEAT + Math.sin(bounce * Math.PI * 2) * 0.12 * (bounce > 0 ? 1 : 0);
      pig.hitWobble(wobble);
      pig.state = { running: false };
      if (statusShown) {
        // It pops in, then turns slowly over the monitor
        statusPop = Math.min(1, statusPop + dt * 3);
        const pop = 1 - Math.pow(1 - statusPop, 3);
        statusShown.scale.setScalar(statusShown.userData.size * (0.4 + 0.6 * pop));
        statusShown.rotation.y = Math.sin(time * 1.3) * 0.5;
        statusShown.position.y = 1.98 + Math.sin(time * 2) * 0.03;
      }
    },
    idleCamera(time) {
      placeCamera(time);
    },
    action(name) {
      if (finished || !current) {
        return;
      }
      if (phase === "actions") {
        if (name === "left") {
          current.move(-1);
        } else if (name === "right") {
          current.move(1);
        } else if (name === "jump") {
          place("before");
        } else if (name === "duck") {
          place("after");
        } else if (name === "confirm") {
          current.confirm();
        }
        return;
      }
      if (phase === "boss") {
        // Up and down put the chosen card back Before or After, Enter the base
        if (name === "left" || name === "right") {
          current.move(name === "left" ? -1 : 1);
        } else if ((name === "jump" || name === "duck") && chosen) {
          bossDrop(chosen.action, name === "jump" ? "before" : "after");
        } else if (name === "confirm") {
          current.confirm();
        }
        return;
      }
      if (name === "jump" || name === "left") {
        current.move(-1);
      } else if (name === "duck" || name === "right") {
        current.move(1);
      } else if (name === "confirm") {
        current.confirm();
      }
    },
    dispose() {
      disposed = true;
      finishDrag();
      if (watcher) {
        watcher.disconnect();
      }
      for (const thing of owned) {
        thing.dispose();
      }
      if (window.__guineaRun && window.__guineaRun.w3) {
        delete window.__guineaRun.w3;
      }
      ctx.setData("pace", "1.00");
      for (const name of ["boss", "boss-hp", "taken", "stolen", "bosstime"]) {
        if (overlayNode) {
          overlayNode.removeAttribute("data-" + name);
        }
      }
      page.remove();
      pig.setSitting(false);
      pig.shadow.visible = true;
      ctx.camera.clearViewOffset();
    }
  };
}

export const CSS = `
/* A finger on a card drags it: the site's buttons ask for "manipulation", which lets the panel scroll instead */
.guinea-run .gr-w3 .gr-w3-card {
  touch-action: none !important;
  -webkit-user-select: none;
  user-select: none;
  cursor: grab;
}

.guinea-run .gr-w3-card.is-dragging {
  opacity: 0.35;
}

.guinea-run .gr-w3-ghost {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 2147483647;
  margin: 0;
  box-shadow: 0 12px 28px rgba(3, 45, 96, 0.35);
  cursor: grabbing;
  pointer-events: none;
}

.guinea-run [data-drop].is-over {
  outline: 3px dashed #0176d3;
  outline-offset: 2px;
  background: #eef4ff;
}

.guinea-run .gr-w3 {
  position: absolute;
  top: calc(env(safe-area-inset-top, 0px) + 96px);
  right: calc(env(safe-area-inset-right, 0px) + 16px);
  bottom: calc(env(safe-area-inset-bottom, 0px) + 16px);
  width: min(560px, calc(100vw - 32px));
  overflow-y: auto;
  overscroll-behavior: contain;
  border: 1px solid #c9c9c9;
  border-radius: 4px;
  background: #ffffff;
  box-shadow: 0 2px 20px rgba(3, 45, 96, 0.35);
  touch-action: pan-y;
  /* It makes room for a message of the shell below 1000 px (see makeRoom) */
  transition: margin 0.15s ease-out;
}
.guinea-run[data-state="intro"] .gr-w3,
.guinea-run[data-state="paused"] .gr-w3,
.guinea-run[data-state="done"] .gr-w3,
.guinea-run[data-state="failed"] .gr-w3,
.guinea-run[data-state="celebrating"] .gr-w3 {
  visibility: hidden;
}
.guinea-run .gr-w3-head {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid #c9c9c9;
  font-size: 15px;
}
.guinea-run .gr-w3-pr {
  padding: 2px 8px;
  border-radius: 999px;
  background: #2e844a;
  color: #ffffff;
  font-size: 12px;
  font-weight: 800;
}
.guinea-run .gr-w3-steps {
  display: flex;
  margin: 0;
  padding: 8px 14px 0;
  list-style: none;
  gap: 4px;
}
.guinea-run .gr-w3-steps li {
  flex: 1 1 0;
  padding: 4px 6px;
  border-radius: 3px;
  background: #e5e5e5;
  color: #444444;
  font-size: 12px;
  font-weight: 700;
  text-align: center;
}
.guinea-run .gr-w3-steps li.is-current {
  background: #0176d3;
  color: #ffffff;
}
.guinea-run .gr-w3-steps li.is-done {
  background: #2e844a;
  color: #ffffff;
}
.guinea-run .gr-w3-body {
  padding: 10px 14px;
}
.guinea-run .gr-w3-question {
  margin: 4px 0 8px;
  font-size: 16px;
  font-weight: 700;
}
.guinea-run .gr-w3-hint,
.guinea-run .gr-w3-keys {
  margin: 2px 0 6px;
  color: #444444;
  font-size: 13px;
}
.guinea-run .gr-w3-keys {
  font-size: 12px;
}
.guinea-run .gr-w3-error {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0 0 10px;
  padding: 8px 10px;
  border-left: 4px solid #ea001e;
  background: #fef1ee;
}
.guinea-run .gr-w3-error strong {
  color: #ba0517;
  font-size: 13px;
}
.guinea-run .gr-w3-error code {
  font-family: "JetBrains Mono", consolas, monospace;
  font-size: 12px;
  word-break: break-word;
  user-select: text;
}
.guinea-run .gr-w3-answers {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.guinea-run .gr-w3-answer {
  min-height: 44px;
  padding: 8px 12px;
  border: 1px solid #c9c9c9;
  border-radius: 4px;
  background: #ffffff;
  color: #181818;
  font: inherit;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  touch-action: manipulation;
}
.guinea-run .gr-w3-answer.is-chosen {
  border-color: #0176d3;
  box-shadow: 0 0 0 2px #0176d3;
}
.guinea-run .gr-w3-answer.is-wrong {
  border-color: #ea001e;
  background: #fef1ee;
  color: #ba0517;
  text-decoration: line-through;
}
.guinea-run .gr-w3-hand {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 52px;
  margin: 6px 0 10px;
  padding: 6px;
  border: 1px dashed #c9c9c9;
  border-radius: 4px;
  background: #f3f3f3;
}
.guinea-run .gr-w3-card {
  display: flex;
  flex: 1 1 150px;
  flex-direction: column;
  gap: 2px;
  min-height: 44px;
  padding: 6px 8px;
  border: 1px solid #c9c9c9;
  border-left: 5px solid var(--gr-w3-type);
  border-radius: 4px;
  background: #ffffff;
  color: #181818;
  font: inherit;
  text-align: left;
  cursor: pointer;
  touch-action: manipulation;
}
.guinea-run .gr-w3-card.is-chosen {
  box-shadow: 0 0 0 2px #0176d3;
}
.guinea-run .gr-w3-card.is-wrong {
  background: #fef1ee;
  border-color: #ea001e;
}
.guinea-run .gr-w3-type {
  color: var(--gr-w3-type);
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
}
.guinea-run .gr-w3-label {
  font-size: 13px;
  line-height: 1.3;
}
.guinea-run .gr-w3-board {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 6px;
  align-items: start;
}
.guinea-run .gr-w3-col {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 90px;
  padding: 6px;
  border: 1px solid #c9c9c9;
  border-radius: 4px;
  background: #fafaf9;
}
.guinea-run .gr-w3-col--bin {
  grid-column: 1 / -1;
  min-height: 56px;
  background: #f3f3f3;
}
.guinea-run .gr-w3-col-head {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 4px 6px;
  border: 1px solid #0176d3;
  border-radius: 4px;
  background: #eef4ff;
  color: #014486;
  font: inherit;
  font-size: 12px;
  font-weight: 800;
  text-align: center;
  cursor: pointer;
  touch-action: manipulation;
}
.guinea-run .gr-w3-col--bin .gr-w3-col-head {
  border-color: #706e6b;
  background: #ffffff;
  color: #444444;
}
.guinea-run .gr-w3-deploy {
  align-self: stretch;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  padding: 6px 4px;
  border-radius: 4px;
  background: #032d60;
  color: #ffffff;
  font-size: 11px;
  font-weight: 800;
  text-align: center;
}
.guinea-run .gr-w3-slot {
  display: flex;
  gap: 4px;
  align-items: stretch;
}
.guinea-run .gr-w3-order {
  display: flex;
  align-items: center;
  padding: 0 4px;
  color: #706e6b;
  font-weight: 800;
}
.guinea-run .gr-w3-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 10px;
}
.guinea-run .gr-w3 .gr-button {
  min-height: 44px;
}
.guinea-run .gr-w3-template {
  margin: 0 14px 12px;
  color: #444444;
  font-size: 12px;
}
.guinea-run .gr-w3-template summary {
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: 0;
  cursor: pointer;
}
.guinea-run .gr-w3-template pre {
  margin: 4px 0 0;
  padding: 6px;
  background: #f3f3f3;
  font-family: "JetBrains Mono", consolas, monospace;
  white-space: pre-wrap;
}

/* Mariia's line inside the board, on a phone */
.guinea-run .gr-w3-mariia {
  display: flex;
  gap: 8px;
  align-items: center;
  margin: 0 0 6px;
  padding: 6px 8px;
  border: 1px solid #c9c9c9;
  border-radius: 12px 12px 12px 2px;
  background: #ffffff;
  color: #181818;
  font-size: 12px;
  line-height: 1.3;
}
.guinea-run .gr-w3-mariia .gr-avatar {
  flex: 0 0 34px;
  width: 34px;
  height: 34px;
}

/* The admin of the end, at the top of the Pull Request: it stays there while the panel scrolls */
.guinea-run .gr-w3-boss {
  position: sticky;
  top: 0;
  z-index: 3;
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 6px 10px;
  border-bottom: 3px solid #dd7a01;
  background: #032d60;
  color: #ffffff;
  animation: gr-w3-in 0.4s ease-out;
}
.guinea-run .gr-w3-boss[hidden] {
  display: none;
}
.guinea-run .gr-w3-boss img {
  flex: 0 0 56px;
  width: 56px;
  height: 56px;
  border: 3px solid #ffffff;
  border-radius: 50%;
  background: #ffffff;
}
.guinea-run .gr-w3-boss.is-hit img {
  animation: gr-w3-flinch 0.45s ease-out;
}
.guinea-run .gr-w3-boss-main {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.guinea-run .gr-w3-boss-top {
  display: flex;
  flex-wrap: wrap;
  gap: 3px 8px;
  align-items: center;
}
.guinea-run .gr-w3-boss strong {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  font-size: 13px;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.guinea-run .gr-w3-boss i {
  display: block;
  flex: 1 0 90px;
  height: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.22);
}
.guinea-run .gr-w3-boss b {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #ff5d2d, #ea001e);
  transition: width 0.25s;
}
.guinea-run .gr-w3-boss.is-angry b {
  background: linear-gradient(90deg, #ea001e, #ba0517);
  animation: gr-w3-blink 0.6s infinite;
}
.guinea-run .gr-w3-boss q {
  display: block;
  box-sizing: border-box;
  min-height: calc(2.6em + 6px);
  padding: 3px 8px;
  border-radius: 8px;
  background: #ffffff;
  color: #032d60;
  font-size: 12.5px;
  line-height: 1.3;
  quotes: none;
}
.guinea-run .gr-w3-boss.is-beaten {
  border-bottom-color: #194e31;
  background: #2e844a;
}

/* The base of the Pull Request during his fight: the branches in the order of the pipeline */
.guinea-run .gr-w3-baserow {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  align-items: center;
  margin: 0 0 6px;
}
.guinea-run .gr-w3-baselabel {
  color: #444444;
  font-size: 13px;
  font-weight: 800;
}
.guinea-run .gr-w3-branches {
  display: flex;
  flex: 1 1 240px;
  gap: 4px;
  min-width: 0;
}
.guinea-run .gr-w3-branch {
  position: relative;
  flex: 1 1 auto;
  min-width: 44px;
  min-height: 44px;
  padding: 4px 6px;
  border: 1px solid #c9c9c9;
  border-radius: 999px;
  background: #ffffff;
  color: #444444;
  font: inherit;
  font-family: "JetBrains Mono", consolas, monospace;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  touch-action: manipulation;
}
.guinea-run .gr-w3-branch.is-base {
  border-color: #2e844a;
  background: #2e844a;
  color: #ffffff;
}
.guinea-run .gr-w3 .gr-w3-branch.is-taken {
  border-color: #ba0517;
  background: #ea001e;
  color: #ffffff;
  cursor: grab;
  touch-action: none !important;
  -webkit-user-select: none;
  user-select: none;
  animation: gr-w3-throb 0.9s infinite;
}
.guinea-run .gr-w3-branch.is-home {
  border: 2px dashed #2e844a;
  background: #eef8f0;
  color: #194e31;
}
.guinea-run .gr-w3-basetimer {
  display: flex;
  flex: 1 0 100%;
  gap: 8px;
  align-items: center;
  min-height: 16px;
}
.guinea-run .gr-w3-basetimer .gr-w3-timer {
  flex: 1 1 auto;
  margin: 0;
}

/* His list: what he took, each with the time left before he does it by hand */
.guinea-run .gr-w3-tray {
  margin: 0 0 8px;
  padding: 6px;
  border: 2px dashed #dd7a01;
  border-radius: 6px;
  background: #fff4e5;
}
.guinea-run .gr-w3-tray-head {
  margin: 0 0 4px;
  color: #8c4b02;
  font-size: 12px;
  font-weight: 800;
}
.guinea-run .gr-w3-tray-cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  min-height: 76px;
}
.guinea-run .gr-w3-tray-empty {
  grid-column: 1 / -1;
  align-self: center;
  margin: 0;
  color: #8c4b02;
  font-size: 12.5px;
  text-align: center;
}
.guinea-run .gr-w3-stolen {
  box-shadow: 0 0 0 2px #ea001e;
  animation: gr-w3-land 0.3s ease-out;
}
.guinea-run .gr-w3-stolen.is-chosen {
  box-shadow: 0 0 0 3px #0176d3;
}
.guinea-run .gr-w3-timer {
  display: block;
  height: 6px;
  margin-top: 4px;
  overflow: hidden;
  border-radius: 999px;
  background: #fcd9d4;
}
.guinea-run .gr-w3-timer i {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 999px;
  background: #dd7a01;
}
.guinea-run .gr-w3-timer-text {
  color: #8c4b02;
  font-size: 11.5px;
  font-weight: 800;
}
.guinea-run .is-late .gr-w3-timer i {
  background: #ea001e;
}
.guinea-run .is-late .gr-w3-timer-text {
  color: #ba0517;
}

/* The plan during his fight: two columns, a dashed hole where he took a card */
.guinea-run .gr-w3-board.gr-w3-board--boss {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.guinea-run .gr-w3-board--boss .gr-w3-col-head {
  cursor: default;
}
.guinea-run .gr-w3 .gr-w3-card--locked,
.guinea-run .gr-w3 .gr-w3-hole {
  cursor: default;
  /* Only what he took is dragged: a finger on the rest scrolls the panel */
  touch-action: pan-y !important;
}
.guinea-run .gr-w3 .gr-w3-hole {
  border: 2px dashed #ea001e;
  background: #fef1ee;
  cursor: default;
}
.guinea-run .gr-w3-hole > * {
  opacity: 0.45;
}
.guinea-run .gr-w3-card.is-aimed,
.guinea-run .gr-w3-branch.is-aimed {
  position: relative;
  box-shadow: 0 0 0 3px #ea001e;
  animation: gr-w3-shake 0.18s infinite;
}
.guinea-run .gr-w3-grabber {
  position: absolute;
  top: -10px;
  right: -6px;
  width: 30px;
  height: 30px;
  border: 2px solid #ffffff;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 2px 6px rgba(3, 45, 96, 0.4);
  pointer-events: none;
}
.guinea-run .gr-w3-green {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0 0 8px;
  padding: 8px 10px;
  border-left: 4px solid #2e844a;
  background: #eef8f0;
  color: #194e31;
  font-size: 13px;
}
.guinea-run .gr-w3-green strong {
  font-size: 14px;
}
.guinea-run .gr-w3-keys--boss {
  margin: 8px 0 0;
}

@keyframes gr-w3-in {
  from {
    opacity: 0;
    transform: translateY(-16px);
  }
}
@keyframes gr-w3-land {
  from {
    opacity: 0.4;
    transform: translateY(-14px) scale(0.92);
  }
}
@keyframes gr-w3-shake {
  25% {
    transform: translateX(-2px) rotate(-1deg);
  }
  75% {
    transform: translateX(2px) rotate(1deg);
  }
}
@keyframes gr-w3-throb {
  50% {
    transform: scale(1.06);
  }
}
@keyframes gr-w3-flinch {
  30% {
    transform: rotate(-14deg) scale(0.9);
  }
  65% {
    transform: rotate(8deg);
  }
}
@keyframes gr-w3-blink {
  50% {
    opacity: 0.55;
  }
}

/* From 1000 px the messages of the shell sit over the desk, beside the Pull Request */
@media (min-width: 1000px) {
  .guinea-run[data-world="3"] .gr-toast,
  .guinea-run[data-world="3"] .gr-tipbar,
  .guinea-run[data-world="3"] .gr-coach {
    left: calc((100% - 592px) / 2);
    max-width: min(620px, calc(100% - 640px));
  }
  .guinea-run[data-world="3"] .gr-chat {
    top: auto;
    right: auto;
    bottom: calc(env(safe-area-inset-bottom, 0px) + 16px);
    left: calc(env(safe-area-inset-left, 0px) + 16px);
    width: min(320px, calc(100% - 640px));
  }
}

/* Below 1000 px the toast and the tip take the width they need, not half the screen, so they stay short */
@media (max-width: 999px) {
  .guinea-run[data-world="3"] .gr-tipbar {
    box-sizing: border-box;
    width: calc(100vw - 24px);
  }
  .guinea-run[data-world="3"] .gr-toast {
    width: max-content;
    max-width: calc(100vw - 32px);
  }
}

@media (max-width: 700px) {
  .guinea-run .gr-w3 {
    top: 42vh;
    right: calc(env(safe-area-inset-right, 0px) + 8px);
    left: calc(env(safe-area-inset-left, 0px) + 8px);
    width: auto;
    bottom: calc(env(safe-area-inset-bottom, 0px) + 8px);
  }
  .guinea-run .gr-w3-board {
    grid-template-columns: 1fr;
  }
  .guinea-run .gr-w3-deploy {
    writing-mode: horizontal-tb;
    transform: none;
  }
  /* A compact head: the title on one line, the steps other than this one as their number */
  .guinea-run .gr-w3-head {
    padding: 6px 10px;
    font-size: 13px;
  }
  .guinea-run .gr-w3-head strong {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .guinea-run .gr-w3-steps {
    padding: 6px 10px 0;
  }
  .guinea-run .gr-w3-steps li {
    overflow: hidden;
    padding: 4px 6px;
    font-size: 11.5px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .guinea-run .gr-w3-steps li:not(.is-current) {
    flex: 0 0 30px;
    font-size: 0;
  }
  .guinea-run .gr-w3-steps li:not(.is-current)::before {
    content: attr(data-n);
    font-size: 12px;
  }
  .guinea-run .gr-w3-steps li.is-done::before {
    content: "\\2713";
  }
  .guinea-run .gr-w3-body {
    padding: 8px 10px;
  }
  .guinea-run .gr-w3-question {
    margin: 2px 0 6px;
    font-size: 15px;
  }
  .guinea-run .gr-w3-error {
    margin-bottom: 8px;
    padding: 6px 8px;
  }
  .guinea-run .gr-w3-error code {
    font-size: 11px;
  }
  .guinea-run .gr-w3-answers {
    gap: 6px;
  }
  .guinea-run .gr-w3-answer {
    padding: 6px 10px;
    font-size: 13.5px;
    line-height: 1.3;
  }
  .guinea-run .gr-w3-template {
    margin: 0 10px 6px;
  }
  /* The board takes the whole height: hand, Before | After, then the bin */
  .guinea-run[data-phase="actions"] .gr-w3,
  .guinea-run[data-phase="boss"] .gr-w3 {
    top: calc(var(--gr-top-end, 120px) + 6px);
  }
  .guinea-run[data-phase="actions"] .gr-w3-hint,
  .guinea-run[data-phase="actions"] .gr-w3-keys {
    display: none;
  }
  .guinea-run[data-phase="actions"] .gr-w3-question {
    margin: 0 0 4px;
    font-size: 14px;
  }
  .guinea-run[data-phase="actions"] .gr-w3-board {
    grid-template-columns: 1fr 1fr;
  }
  .guinea-run[data-phase="actions"] .gr-w3-deploy {
    display: none;
  }
  /* Two cards a row in the hand, so the columns are in view */
  .guinea-run[data-phase="actions"] .gr-w3-hand {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin: 4px 0 8px;
    padding: 5px;
  }
  .guinea-run[data-phase="actions"] .gr-w3-card,
  .guinea-run[data-phase="boss"] .gr-w3-card {
    min-height: 48px;
    padding: 5px 7px;
  }
  .guinea-run[data-phase="actions"] .gr-w3-type,
  .guinea-run[data-phase="boss"] .gr-w3-type {
    font-size: 10px;
  }
  .guinea-run[data-phase="actions"] .gr-w3-label,
  .guinea-run[data-phase="boss"] .gr-w3-label {
    font-size: 12px;
    line-height: 1.25;
  }
  .guinea-run[data-phase="actions"] .gr-w3-order,
  .guinea-run[data-phase="boss"] .gr-w3-order {
    padding: 0 2px;
    font-size: 12px;
  }
  .guinea-run[data-phase="actions"] .gr-w3-col,
  .guinea-run[data-phase="boss"] .gr-w3-col {
    padding: 4px;
  }
  .guinea-run .gr-w3-col-head {
    font-size: 11.5px;
  }
  .guinea-run .gr-w3-buttons {
    flex-wrap: nowrap;
  }
  .guinea-run .gr-w3-buttons .gr-button {
    flex: 1 1 0;
    padding: 6px 8px;
    font-size: 13px;
    line-height: 1.2;
  }
  /* His fight on a phone: the head and the steps of the Pull Request leave the room to the board */
  .guinea-run[data-phase="boss"] .gr-w3-head,
  .guinea-run[data-phase="boss"] .gr-w3-steps {
    display: none;
  }
  .guinea-run .gr-w3-boss {
    gap: 8px;
    padding: 5px 8px;
  }
  .guinea-run .gr-w3-boss img {
    flex-basis: 48px;
    width: 48px;
    height: 48px;
  }
  .guinea-run .gr-w3-boss q {
    font-size: 12px;
  }
  .guinea-run .gr-w3-tray-cards {
    min-height: 72px;
  }
  /* Under the mute, pause and close buttons, which the goal line no longer pushes down */
  .guinea-run[data-phase="boss"] .gr-w3 {
    top: max(calc(var(--gr-top-end, 120px) + 6px), calc(env(safe-area-inset-top, 0px) + 58px));
  }
  .guinea-run .gr-w3-branch {
    padding: 4px;
    font-family: inherit;
    font-size: 12px;
  }
}

/* A small phone: the panel starts higher, the desk still shows its monitor above it */
@media (max-width: 700px) and (max-height: 760px) {
  .guinea-run .gr-w3 {
    top: 35vh;
  }
}

@media (prefers-reduced-motion: reduce) {
  .guinea-run .gr-w3-boss,
  .guinea-run .gr-w3-boss.is-hit img,
  .guinea-run .gr-w3-boss.is-angry b,
  .guinea-run .gr-w3-stolen,
  .guinea-run .gr-w3-card.is-aimed,
  .guinea-run .gr-w3-branch.is-aimed,
  .guinea-run .gr-w3 .gr-w3-branch.is-taken {
    animation: none;
  }
  .guinea-run .gr-w3 {
    transition: none;
  }
}
`;
