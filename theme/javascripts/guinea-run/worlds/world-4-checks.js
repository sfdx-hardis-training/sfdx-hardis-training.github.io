/*
 * World 4, Pass the checks: a lane defense in front of a
 * Pull Request. The findings of its two checks march down three lanes towards
 * it, and the guinea pig throws fixes at the first finding of its lane.
 *
 * The first part is the order of the waves. Grey MegaLinter warnings come first: they
 * do not block, and a fix spent on one is time lost. Then the red errors, led
 * by pmd:OperationWithLimitsInLoop, which runs again behind itself while it
 * lives, the way a query in a loop does. Then a busy Monday: the boss counts
 * accounts, and at 101 it throws Too many SOQL queries. Beating it is the
 * usual fix, one query outside the loop, and the longer code drops the
 * coverage to 76.92%: the last wave brings tests to catch, and tests that
 * assert nothing to throw away.
 *
 * The finale: both checks green, Mariia's US-052 waits for a review with a
 * big green merge button, and the Opportunity layout lost Next_Step__c on
 * the way. Spotting it and asking for the change wins; merging costs an
 * attempt.
 *
 * The boss at the end: a Dev (one of the twenty-one faces, a different one at
 * each play) who wants his 80% by padding his test class with i++. He throws
 * lines of i++ down the lanes, with an empty catch, a query in a loop or a
 * hardcoded Id among them. The guinea pig stops them and hits him when his
 * lane is clear, until he says he will write real assertions.
 */
import { SLDS, pictureBox, rounded, fitText, glyph } from "../core/painter.js";
import { pickAdmins, adminFaceUrl } from "../core/faces.js";
import { createDevFigure, createDevBar, createDevSpeech, DEV_CSS, DEV_HEAD_R } from "../core/dev.js";

export const PADS = ["left", "right", "jump", "confirm"];
// The world's own items: CI runners, check statuses, Apex test flasks, Victor's note
/** On a phone, toasts and tips sit above the pads: the track runs up the middle. */
export const PHONE_MESSAGES = "bottom";

export const MODELS = ["salesforce"];
/** The theme of the world, and the Dev's own while he fights (core/themes.js). */
export let MUSIC = 4;

const LANES = [-2.2, 0, 2.2];
const SPAWN_Z = -22;
const PIG_Z = 0.4;
// A finding that gets this close is on the Pull Request
const PR_LINE = 1.75;
const THROW_SPEED = 24;
const THROW_COOLDOWN = 0.2;
const WASTED_STUN = 0.5;
const CLONE_AFTER = 6;

// The numbers of the checks
const COVERAGE_LOOP = 81;
const COVERAGE_FIXED = 76.92;
const COVERAGE_TARGET = 80;
const COVERAGE_FLOOR = 75;
const COVERAGE_PER_TEST = 0.9;
const BOSS_HP = 10;
const SOQL_LIMIT = 101;
const BOSS_COUNT_RATE = 2.6;
const BOSS_SCALE = 1.45;
// The pace: 1 at the start, about +36% by the end of the coverage wave
const PACE_GAIN = 0.36;
const MERCY = 0.2;
const MERCY_FADE = 0.04;

// The Dev at the end
const DEV_HP = 12;
const DEV_Z = -9;
const DEV_SCALE = 1.6;
const DEV_PACE = 1.12;
const DEV_ENTER_S = 2.8;
const DEV_BEATEN_S = 3.4;
const DEV_LEAVE_S = 1.1;
// After a hit he hops to another lane, and a fix cannot touch him on the way
const DEV_GUARD_S = 0.9;
// Out of attempts at the Dev: the next try, within this time, starts at him
const DEV_RETRY_MS = 15 * 60000;
let devRetryAt = 0;

// The Opportunity Information section of Opportunity-Opportunity Layout, before US-052
const LAYOUT = [
  ["Opportunity Name", "Name"],
  ["Account Name", "AccountId"],
  ["Type", "Type"],
  ["Lead Source", "LeadSource"],
  ["Close Date", "CloseDate"],
  ["Next Step", "Next_Step__c"],
  ["Stage", "StageName"],
  ["Amount", "Amount"],
  ["Probability (%)", "Probability"],
  ["Discount", "Discount__c"],
  ["Description", "Description"]
];
const MOVED = "CloseDate";
const DROPPED = "Next_Step__c";
// A required field, with its own answer when the comment lands on it
const REQUIRED = "StageName";

export const TEXTS = {
  en: {
    intro: "Your next story, US-016, computes the tier in Apex. The findings of its Pull Request's checks march on it down three lanes. Stop the errors, keep the coverage over 80%, then review Mariia's Pull Request before you merge it. A Dev waits at the end.",
    how1: "Left and right arrows, or swipe, to change lane",
    how2: "Up, Space or a tap throws a fix down your lane",
    how3: "Stop the red errors, let the grey warnings pass",
    goal1: "Let the grey warnings pass: do not throw",
    goal2: "Throw a fix at every red error",
    goal3: "Hit the big loop before it reaches 101",
    goal4: "Catch the green tests, throw at No assert",
    goal5: "1. Compare Before and After",
    goal5drag: "2. Drag the comment onto the missing field",
    goal5b: "3. Request changes, do not merge",
    coach1: "Grey warnings do not block: let them walk by!",
    coach2: "Red errors block the merge: throw at them!",
    coach3: "Throw at the big red loop!",
    coach4: "Stand in front of green tests to catch them!",
    coach5: "Green checks. Is the layout right?",
    coach5b: "Found it! Now press Request changes",
    coach5drag: "Drag the comment onto a line of Before",
    coachWarn: "Grey is a warning: let it pass",
    coachError: "Change lane and throw at the red ones!",
    coachTestShot: "Do not throw at green tests: catch them",
    coachFake: "Step aside from No assert, or throw at it",
    chip_warnDebug: "Warning: debug",
    chip_warnDoc: "Warning: ApexDoc",
    chip_warnTrivy: "Warning: Trivy",
    chip_warnActions: "Warning: workflows",
    chip_loop: "SOQL in a loop",
    chip_required: "LastName missing",
    chip_select: "SELECT in loop",
    chip_golden: "Hardcoded Id",
    chip_test: "Real test",
    chip_fake: "No assert",
    bossFace: "Too many SOQL",
    checkDeploy: "Deployment check",
    noteWarnings: "warnings",
    noteErrors: "1 error",
    readyShort: "Ready to merge",
    blockedShort: "Merging is blocked",
    note: "Salesforce is happy to deploy a hardcoded id with 100% coverage. No check refuses that one: a reviewer does. - V.",
    p1: "Warnings",
    p2: "Errors",
    p3: "Busy Monday",
    p4: "Coverage",
    p5: "Review",
    coverage: "Coverage",
    floor: "Salesforce 75%",
    target: "Project 80%",
    w1_title: "Wave 1: MegaLinter warnings",
    w1_sub: "Warnings do not block. Let them pass.",
    w2_title: "Wave 2: errors",
    w2_sub: "A red error blocks the merge. Stop every one.",
    w3_title: "A busy Monday",
    w3_sub: "101 accounts updated at once.",
    w4_title: "Wave 4: tests",
    w4_sub: "Catch the tests that assert something. Throw away the others.",
    w5_title: "Mariia's Pull Request",
    w5_sub: "Green checks. Read the diff before you merge.",
    warnPassed: "Warning passed: Success with warnings",
    warnShot: "A warning does not block: that fix was time lost",
    warnLesson: "Warnings pass, errors block",
    errorReached: "Merging is blocked: {{finding}}",
    tip_loop: "Query the contacts once, outside the loop, into a Map<Id, List<Contact>>, then loop over the accounts: one query, whatever the size of the list.",
    tip_required: "LastName is required on Contact: every test that inserts a contact sets LastName.",
    tip_select: "Salesforce allows 100 SOQL queries per transaction. Query once, outside the loop.",
    tip_limit: "The loop works in every test and fails on the first busy day. Query once, outside the loop, and index what you get back.",
    fix_loop: "Query once, outside the loop",
    fix_required: "LastName = 'Test'",
    fix_select: "One query for the whole list",
    loopAgain: "The loop runs again: one more query",
    bossHit: "Bulkify",
    bossDown: "One query, whatever the size of the list",
    limitHit: "System.LimitException: Too many SOQL queries: 101",
    coverageDrop: "Cannot merge into the integration branch: code coverage 76.92% is under the 80% target",
    testCaught: "+0.9% {{name}}",
    testShot: "You threw away a real test",
    fakeCaught: "No assertion: a test that only lifts the percentage makes the number lie",
    fakeShot: "No assertion, no test",
    fakeName: "@isTest runsTheCode()",
    fakeDetail: "0 assertions",
    goldenPassed: "A hardcoded Id deployed: no check refuses it",
    goldenTitle: "Hardcoded Id",
    goldenDetail: "100% coverage, deploys fine",
    checksGreen: "Both checks green",
    ownMerged: "Squash and merge: US-016 merged into the integration branch",
    prInto: "into the integration branch from features/US-016-tier-from-contacts",
    mariiaInto: "Mariia Pyvovarchuk wants to merge into the integration branch",
    running: "running",
    passing: "passing",
    blocked: "Merging is blocked",
    ready: "Ready to merge into the integration branch",
    merged: "Merged",
    review_desc: "Opportunity layout: Delivery Date joins the second column, and Close Date moves there next to it",
    review_task: "Files changed: Opportunity-Opportunity Layout, Opportunity Information section",
    review_step1: "Compare Before and After",
    review_step2: "Drag the comment",
    review_step3: "Request changes",
    review_lab: "Does anything disappear? A removed field, a removed picklist value, a removed permission. Salesforce will happily deploy a deletion.",
    review_descTitle: "Mariia's description:",
    review_card: "Review comment",
    review_cardHint: "Drag it onto the line of the field that is gone",
    review_movedShort: "moves to column 2",
    review_movedIn: "moved here",
    review_new: "new",
    review_missing: "nowhere in After",
    mergeCaption: "Green checks only mean it will deploy",
    review_before: "Before",
    review_after: "After",
    review_empty: "Empty column",
    review_column2: "Column 2",
    pick_moved: "It moved: it comes back in the second column, next to Delivery Date. That is the story.",
    pick_required: "Stage is required on every opportunity: still there, in the first column.",
    pick_still: "Still there, in the first column",
    pick_found: "Next_Step__c leaves the layout, and the description does not say so",
    request_hint: "First drop the comment on the line of the field that is gone.",
    comment: "Next_Step__c comes off the layout with this change, and the description does not say so. I think it went missing with the move: can you put it back in the second column, under Close Date?",
    mergeTitle: "Merged too early",
    mergeTip: "Green checks mean this will deploy, not this is right. Read the diff, comment on the removed line and ask for the change. If you merged too early: Restore branch, and review the fix in a new Pull Request.",
    mergedBody: "Next_Step__c is off the layout in the integration org, and the merge deleted Mariia's branch, which her fix starts from.",
    mariia_open: "US-052 is open, and its checks are green: it waits for you.",
    mariia_fix: "Good catch, it went missing when I moved Close Date. Next_Step__c is back in the second column, under Close Date.",
    mariia_merged: "You merged it? Sales reps will look for the next step on Monday morning.",
    fixMerged: "Squash and merge: US-052 merged into the integration branch",
    rerun: "Her new commit: the checks run again",
    faster: "Faster!",
    coverageShort: "Coverage still under 80%: in a real project the check would refuse it",
    missedCoverage: "The coverage stayed at {{coverage}}%: the deployment check refuses anything under 80%, and the two tests of AccountTierService are what lets it through.",
    missedMerge: "You merged US-052 before the fix: that takes Next_Step__c off the layout in the integration org, and Restore branch is the way back.",
    p6: "Dev",
    goal6: "Stop the i++, then throw at the Dev",
    devName: "Dev",
    devPr: "The Dev's Pull Request",
    devInto: "AccountTierServiceTest.cls: 300 lines of i++",
    devArrive: "80% coverage by Friday? Easy: I fill my test class with i++.",
    devLine1: "Coverage is coverage! Nobody reads test classes.",
    devLine2: "Then an empty catch: no error, no problem!",
    devOuch: "Hey, that line was covered!",
    devGloat: "See? The percentage goes up!",
    devGiveUp: "OK, OK... I'll write real tests, with real assertions.",
    chip_ipp: "i++",
    chip_emptyCatch: "Empty catch",
    chip_hardId: "Hardcoded Id",
    fix_ipp: "i++ is not a test",
    fix_catch: "Handle the error, or let it fail",
    fix_hardId: "Query the record, never its Id",
    tip_catch: "An empty catch hides the error: the test goes green and the bug ships. Log it, handle it, or let it fail.",
    tip_hardId: "A record Id changes from one org to the next: the code works in your sandbox and fails in the production org. Query the record by a field that means something.",
    ippIn: "i++ got in: the coverage goes up, nothing is tested",
    devDown: "Coverage comes from assertions",
    devLesson: "The quality gate and the reviewer caught the fake coverage",
    retryHint: "Try again starts at the Dev.",
    retryBoss: "Straight back to the Dev: your review is done",
    missedPadding: "{{n}} lines of i++ reached the Pull Request: they lift the coverage and test nothing. A test proves something, with System.assertEquals."
  },
  fr: {
    intro: "Votre story suivante, US-016, calcule le niveau en Apex. Les trouvailles des contrôles de sa Pull Request marchent sur elle par trois couloirs. Arrêtez les erreurs, gardez la couverture au-dessus de 80 %, puis relisez la Pull Request de Mariia avant de la merger. Un dev vous attend à la fin.",
    how1: "Flèches gauche et droite, ou glisser, pour changer de couloir",
    how2: "Haut, Espace ou un tap lance une correction",
    how3: "Arrêtez les erreurs rouges, laissez passer les gris",
    goal1: "Laissez passer les avertissements gris : ne lancez rien",
    goal2: "Lancez une correction sur chaque erreur rouge",
    goal3: "Touchez la grosse boucle avant 101",
    goal4: "Attrapez les tests verts, visez les Sans assertion",
    goal5: "1. Comparez Avant et Après",
    goal5drag: "2. Glissez le commentaire sur le champ disparu",
    goal5b: "3. Request changes, ne mergez pas",
    coach1: "Les avertissements gris ne bloquent pas : laissez-les passer !",
    coach2: "Les erreurs rouges bloquent le merge : visez-les !",
    coach3: "Visez la grosse boucle rouge !",
    coach4: "Placez-vous devant les tests verts pour les attraper !",
    coach5: "Contrôles verts. La présentation est-elle juste ?",
    coach5b: "Trouvé ! Appuyez sur Request changes",
    coach5drag: "Glissez le commentaire sur une ligne d'Avant",
    coachWarn: "Gris, c'est un avertissement : laissez passer",
    coachError: "Changez de couloir et visez les rouges !",
    coachTestShot: "Ne visez pas les tests verts : attrapez-les",
    coachFake: "Évitez les Sans assertion, ou visez-les",
    chip_warnDebug: "Avertissement debug",
    chip_warnDoc: "Avertissement ApexDoc",
    chip_warnTrivy: "Avertissement Trivy",
    chip_warnActions: "Avertissement workflows",
    chip_loop: "SOQL en boucle",
    chip_required: "LastName manquant",
    chip_select: "SELECT en boucle",
    chip_golden: "Id en dur",
    chip_test: "Vrai test",
    chip_fake: "Sans assertion",
    bossFace: "Trop de SOQL",
    checkDeploy: "Contrôle de déploiement",
    noteWarnings: "avertissements",
    noteErrors: "1 erreur",
    readyShort: "Ready to merge",
    blockedShort: "Merging is blocked",
    note: "Salesforce déploie volontiers un id en dur avec 100 % de couverture. Aucun contrôle ne le refuse : un relecteur, si. - V.",
    p1: "Avertissements",
    p2: "Erreurs",
    p3: "Lundi chargé",
    p4: "Couverture",
    p5: "Revue",
    coverage: "Couverture",
    floor: "Salesforce 75 %",
    target: "Projet 80 %",
    w1_title: "Vague 1 : les avertissements de MegaLinter",
    w1_sub: "Les avertissements ne bloquent pas. Laissez-les passer.",
    w2_title: "Vague 2 : les erreurs",
    w2_sub: "Une erreur rouge bloque le merge. Arrêtez-les toutes.",
    w3_title: "Un lundi chargé",
    w3_sub: "101 comptes mis à jour d'un coup.",
    w4_title: "Vague 4 : les tests",
    w4_sub: "Attrapez les tests qui vérifient quelque chose. Jetez les autres.",
    w5_title: "La Pull Request de Mariia",
    w5_sub: "Contrôles verts. Lisez le diff avant de merger.",
    warnPassed: "Avertissement passé : Success with warnings",
    warnShot: "Un avertissement ne bloque pas : cette correction, c'est du temps perdu",
    warnLesson: "Les avertissements passent, les erreurs bloquent",
    errorReached: "Merging is blocked : {{finding}}",
    tip_loop: "Une seule requête sur les contacts, hors de la boucle, dans une Map<Id, List<Contact>>, puis la boucle sur les comptes : une requête, quelle que soit la taille de la liste.",
    tip_required: "LastName est obligatoire sur Contact : chaque test qui insère un contact renseigne LastName.",
    tip_select: "Salesforce autorise 100 requêtes SOQL par transaction. Une seule requête, hors de la boucle.",
    tip_limit: "La boucle marche dans tous les tests et échoue le premier jour chargé. Une seule requête, hors de la boucle, et indexez ce qu'elle renvoie.",
    fix_loop: "Une requête, hors de la boucle",
    fix_required: "LastName = 'Test'",
    fix_select: "Une requête pour toute la liste",
    loopAgain: "La boucle repasse : une requête de plus",
    bossHit: "Bulkifier",
    bossDown: "Une requête, quelle que soit la taille de la liste",
    limitHit: "System.LimitException: Too many SOQL queries: 101",
    coverageDrop: "Cannot merge into the integration branch: code coverage 76.92% is under the 80% target",
    testCaught: "+0,9 % {{name}}",
    testShot: "Vous avez jeté un vrai test",
    fakeCaught: "Aucune assertion : un test qui ne fait que monter le pourcentage fait mentir le nombre",
    fakeShot: "Pas d'assertion, pas de test",
    fakeName: "@isTest runsTheCode()",
    fakeDetail: "0 assertions",
    goldenPassed: "Un Id en dur déployé : aucun contrôle ne le refuse",
    goldenTitle: "Id en dur",
    goldenDetail: "100 % de couverture, se déploie bien",
    checksGreen: "Les deux contrôles au vert",
    ownMerged: "Squash and merge : US-016 mergée dans la branch integration",
    prInto: "vers la branch integration depuis features/US-016-tier-from-contacts",
    mariiaInto: "Mariia Pyvovarchuk veut merger dans la branch integration",
    running: "en cours",
    passing: "réussi",
    blocked: "Merging is blocked",
    ready: "Ready to merge into the integration branch",
    merged: "Merged",
    review_desc: "Présentation de page Opportunité : Delivery Date arrive dans la deuxième colonne, et Close Date y passe à côté",
    review_task: "Files changed : Opportunity-Opportunity Layout, section Opportunity Information",
    review_step1: "Comparer Avant et Après",
    review_step2: "Glisser le commentaire",
    review_step3: "Request changes",
    review_lab: "Est-ce que quelque chose disparaît ? Un champ retiré, une valeur de liste de sélection retirée, une permission retirée. Salesforce déploiera volontiers une suppression.",
    review_descTitle: "La description de Mariia :",
    review_card: "Commentaire de revue",
    review_cardHint: "Glissez-le sur la ligne du champ disparu",
    review_movedShort: "passe en colonne 2",
    review_movedIn: "déplacé ici",
    review_new: "nouveau",
    review_missing: "nulle part dans Après",
    mergeCaption: "Des contrôles verts veulent seulement dire que ça se déploie",
    review_before: "Avant",
    review_after: "Après",
    review_empty: "Colonne vide",
    review_column2: "Colonne 2",
    pick_moved: "Il a bougé : il revient dans la deuxième colonne, à côté de Delivery Date. C'est la story.",
    pick_required: "Stage est obligatoire sur chaque opportunité : toujours là, dans la première colonne.",
    pick_still: "Toujours là, dans la première colonne",
    pick_found: "Next_Step__c sort de la présentation de page, et la description n'en dit rien",
    request_hint: "Posez d'abord le commentaire sur la ligne du champ disparu.",
    comment: "Next_Step__c comes off the layout with this change, and the description does not say so. I think it went missing with the move: can you put it back in the second column, under Close Date?",
    mergeTitle: "Mergée trop tôt",
    mergeTip: "Des contrôles verts veulent dire que ça se déploiera, pas que c'est juste. Lisez le diff, commentez la ligne supprimée et demandez la correction. Mergé trop tôt : Restore branch, puis relisez la correction dans une nouvelle Pull Request.",
    mergedBody: "Next_Step__c n'est plus sur la présentation de page dans l'org d'integration, et le merge a supprimé la branch de Mariia, d'où part sa correction.",
    mariia_open: "US-052 est ouverte, et ses contrôles sont verts : elle vous attend.",
    mariia_fix: "Bien vu, il s'est perdu quand j'ai déplacé Close Date. Next_Step__c est revenu dans la deuxième colonne, sous Close Date.",
    mariia_merged: "Tu l'as mergée ? Les commerciaux chercheront la prochaine étape lundi matin.",
    fixMerged: "Squash and merge : US-052 mergée dans la branch integration",
    rerun: "Son nouveau commit : les contrôles repartent",
    faster: "Plus vite !",
    coverageShort: "Couverture toujours sous 80 % : sur un vrai projet, le contrôle la refuserait",
    missedCoverage: "La couverture est restée à {{coverage}} % : le contrôle de déploiement refuse tout ce qui est sous 80 %, et ce sont les deux tests d'AccountTierService qui la font passer.",
    missedMerge: "Vous avez mergé US-052 avant la correction : cela retire Next_Step__c de la présentation de page dans l'org d'integration, et Restore branch est le chemin du retour.",
    p6: "Dev",
    goal6: "Arrêtez les i++, puis visez le dev",
    devName: "Dev",
    devPr: "La Pull Request du dev",
    devInto: "AccountTierServiceTest.cls : 300 lignes de i++",
    devArrive: "80 % de couverture pour vendredi\u00a0? Facile\u00a0: je remplis ma classe de test avec des i++.",
    devLine1: "La couverture, c'est la couverture\u00a0! Personne ne lit les classes de test.",
    devLine2: "Alors un catch vide\u00a0: pas d'erreur, pas de problème\u00a0!",
    devOuch: "Hé, cette ligne était couverte\u00a0!",
    devGloat: "Vous voyez\u00a0? Le pourcentage monte\u00a0!",
    devGiveUp: "OK, OK... j'écris de vrais tests, avec de vraies assertions.",
    chip_ipp: "i++",
    chip_emptyCatch: "catch vide",
    chip_hardId: "Id en dur",
    fix_ipp: "i++ n'est pas un test",
    fix_catch: "Traitez l'erreur, ou laissez-la échouer",
    fix_hardId: "Requêtez l'enregistrement, pas son Id",
    tip_catch: "Un catch vide cache l'erreur : le test passe au vert et le bug part avec. Tracez-la, traitez-la, ou laissez-la échouer.",
    tip_hardId: "Un Id d'enregistrement change d'une org à l'autre : le code marche dans votre sandbox et échoue dans l'org de production. Requêtez l'enregistrement par un champ qui a du sens.",
    ippIn: "Un i++ est passé : la couverture monte, rien n'est testé",
    devDown: "La couverture vient des assertions",
    devLesson: "Le contrôle qualité et le relecteur ont repéré la fausse couverture",
    retryHint: "Réessayer reprend au dev.",
    retryBoss: "Retour direct au dev : votre revue est faite",
    missedPadding: "{{n}} lignes de i++ ont atteint la Pull Request : elles montent la couverture et ne testent rien. Un test prouve quelque chose, avec System.assertEquals."
  }
};

/** The strings taken word for word from the labs, checked by scripts/verify/check-easter-egg.mjs. */
export const QUOTES = [
  { lab: "2.5", text: "pmd:OperationWithLimitsInLoop" },
  { lab: "2.5", text: "Avoid operations in loops that may hit governor limits" },
  { lab: "2.5", text: "(Moderate)" },
  { lab: "2.5", text: "Too many SOQL queries: 101" },
  { lab: "2.5", text: "System.LimitException: Too many SOQL queries: 101" },
  { lab: "2.5", text: "[sfdx-hardis][apextest] Test run code coverage (org wide) 76.92% should be greater than 80%" },
  { lab: "2.5", text: "Mega-Linter" },
  { lab: "2.5", text: "code-analyzer-apex" },
  { lab: "1.6", text: "Success with warnings" },
  { lab: "3.1", text: "Simulate Deployment to Major Org" },
  { lab: "3.2", text: "Files changed" },
  { lab: "3.2", text: "Request changes" },
  { lab: "3.2", text: "Squash and merge" },
  { lab: "3.2", text: "Restore branch" },
  { lab: "3.2", text: "Ready to merge into" },
  { lab: "3.2", text: "comes off the layout with this change, and the description does not say so." }
];

// What marches down the lanes. tone: warning (grey, let it pass), error (red,
// stop it), test (green, catch it), fake (pale, throw it away), golden.
const KINDS = {
  warnDebug: { tone: "warning", title: "(Low)  pmd:AvoidDebugStatements", detail: "AccountTierService.cls", speed: 2.48 },
  warnDoc: { tone: "warning", title: "(Low)  pmd:ApexDoc", detail: "Missing ApexDoc comment", speed: 2.32 },
  warnTrivy: { tone: "warning", title: "REPOSITORY_TRIVY", detail: "DISABLE_ERRORS_LINTERS", speed: 2.64 },
  warnActions: { tone: "warning", title: "GitHub Actions workflows", detail: "Success with warnings", speed: 2.4 },
  loop: { tone: "error", title: "(Moderate)  pmd:OperationWithLimitsInLoop", detail: "Avoid operations in loops that may hit governor limits", speed: 1.84, hp: 1, clones: true, fix: "fix_loop", tip: "tip_loop", points: 50 },
  required: { tone: "error", title: "REQUIRED_FIELD_MISSING", detail: "Required fields are missing: [LastName]", speed: 1.36, hp: 2, fix: "fix_required", tip: "tip_required", points: 80 },
  select: { tone: "error", title: "SELECT Id, Title", detail: "FROM Contact", speed: 2.72, hp: 1, fix: "fix_select", tip: "tip_select", points: 30 },
  golden: { tone: "golden", speed: 3.68, hp: 1 },
  test: { tone: "test", speed: 2.24 },
  fake: { tone: "fake", speed: 2.24 },
  // What the Dev throws: mostly lines of i++, now and then worse
  ipp: { tone: "padding", title: "i++;", face: "i++", speed: 2.2, hp: 1, points: 15 },
  emptyCatch: { tone: "error", title: "catch (Exception e) {}", detail: "AccountTierService.cls", speed: 1.9, hp: 1, fix: "fix_catch", tip: "tip_catch", points: 40 },
  hardId: { tone: "error", title: "WHERE Id = '0015g00000XyZ1AAA'", detail: "AccountTierService.cls", speed: 2.1, hp: 1, fix: "fix_hardId", tip: "tip_hardId", points: 40 }
};
// The Dev's worse lines, by stage of the fight
const DEV_WORSE = [["hardId", "select"], ["hardId", "select", "emptyCatch"], ["emptyCatch", "select", "emptyCatch", "hardId"]];
const WARNINGS = ["warnDebug", "warnDoc", "warnTrivy", "warnActions"];
const TEST_NAMES = [
  "tierIsGoldForAccountsWithManyContacts",
  "tierStaysEmptyForAccountsWithNoContacts",
  "System.assertEquals('Gold', acme.Customer_Tier__c, ...)",
  "System.assertEquals(null, initech.Customer_Tier__c, ...)"
];
const TONES = {
  warning: { color: SLDS.grey, icon: "warning", side: 0x706e6b },
  error: { color: SLDS.error, icon: "error", side: 0xba0517 },
  test: { color: SLDS.success, icon: "check", side: 0x2e844a },
  fake: { color: "#8AA594", icon: "empty", side: 0x8aa594 },
  golden: { color: "#C98A00", icon: "star", side: 0xf2c94c },
  padding: { color: "#DD7A01", icon: "code", side: 0xa35400 }
};

export function createWorld(ctx) {
  const { THREE, root, pig, paint, t, hud, engine, camera } = ctx;
  const random = ctx.random;
  MUSIC = 4;

  /* ---------- The stage: three lanes from the linter to the Pull Request ---------- */

  const floor = new THREE.Mesh(
    paint.geometry("w4-floor", () => new THREE.BoxGeometry(7.4, 0.3, 26)),
    paint.plain(0xffffff, { roughness: 0.85 })
  );
  floor.position.set(0, -0.15, -11.2);
  floor.receiveShadow = true;
  root.add(floor);
  // Three tinted lanes, so the floor is not one grey slab
  const laneGeometry = paint.geometry("w4-lane", () => new THREE.PlaneGeometry(2.1, 26));
  [0xd8ecff, 0xd5f5ef, 0xefe3fb].forEach((colour, i) => {
    const lane = new THREE.Mesh(laneGeometry, paint.plain(colour, { roughness: 0.9 }));
    lane.rotation.x = -Math.PI / 2;
    lane.position.set(LANES[i], 0.005, -11.2);
    lane.receiveShadow = true;
    root.add(lane);
  });
  const stripeGeometry = paint.geometry("w4-stripe", () => new THREE.BoxGeometry(0.08, 0.02, 26));
  for (const x of [-1.1, 1.1]) {
    const stripe = new THREE.Mesh(stripeGeometry, paint.plain(0xc9c9c9));
    stripe.position.set(x, 0.01, -11.2);
    root.add(stripe);
  }
  const edgeGeometry = paint.geometry("w4-edge", () => new THREE.BoxGeometry(0.2, 0.34, 26));
  for (const [x, colour] of [
    [-3.7, 0x1b96ff],
    [3.7, 0xe3066a]
  ]) {
    const edge = new THREE.Mesh(edgeGeometry, paint.plain(colour, { roughness: 0.45 }));
    edge.position.set(x, -0.12, -11.2);
    root.add(edge);
  }
  // Where the findings come from: the check that reports them
  const source = new THREE.Mesh(paint.geometry("w4-source", () => new THREE.PlaneGeometry(6.4, 1.1)), sourceMaterial("Mega-Linter"));
  source.position.set(0, 2.2, SPAWN_Z - 1.5);
  root.add(source);
  const sourcePosts = paint.geometry("w4-post", () => new THREE.BoxGeometry(0.22, 2.8, 0.22));
  for (const [x, colour] of [
    [-3.3, 0xffb400],
    [3.3, 0x9050e9]
  ]) {
    // The arch stands on two CI runners: the check that reports the findings
    const gate = model("ci-runner", { height: 2.6 }, x, SPAWN_Z - 1.6, 0, true);
    if (!gate) {
      const post = new THREE.Mesh(sourcePosts, paint.plain(colour));
      post.position.set(x, 1.4, SPAWN_Z - 1.5);
      root.add(post);
    }
  }
  // One status over each CI runner behind the Pull Request, as its check says
  const statusSlots = [];
  let cloudity = null;
  buildYard();

  /** A Kenney model placed in the world, or null when the pack did not load. */
  function model(name, size, x, z, turn, shadows) {
    const copy = ctx.models && ctx.models.get(name, Object.assign({ shadows: Boolean(shadows) }, size));
    if (!copy) {
      return null;
    }
    copy.position.set(x, 0, z);
    copy.rotation.y = turn || 0;
    root.add(copy);
    return copy;
  }

  // Off the lanes only: nothing here is in the way of a finding or a fix
  function buildYard() {
    // The runners the two checks of the Pull Request run on, each with its status
    [
      [-4.9, 2.6, 0.5],
      [4.9, 2.6, -0.5]
    ].forEach(([x, z, turn], i) => {
      model("ci-runner", { height: 1.5 }, x, z, turn, true);
      const slot = {};
      for (const status of ["pass", "warn", "fail"]) {
        const item = model("check-" + status, { height: 0.8 }, x, z, turn);
        if (item) {
          item.position.y = 1.65;
          item.visible = false;
          slot[status] = item;
        }
      }
      statusSlots[i] = slot;
    });
    // Next to the Pull Request card, the Pull Request itself
    const merge = model("pull-request", { height: 0.9 }, -4.1, 4.4, 0.3);
    if (merge) {
      merge.rotation.x = -0.2;
    }
    // More CI jobs down the yard, and the target org up in the sky
    model("ci-runner", { height: 1.4 }, -5.0, -6, 0.4);
    model("ci-runner", { height: 1.4 }, 5.0, -10, -0.4);
    model("ci-runner", { height: 1.4 }, -5.0, -15, 0.4);
    const sky = [
      [-7, 6.5, -20, 3],
      [7.5, 5.5, -16, 2.4]
    ];
    for (const [x, y, z, h] of sky) {
      const org = model("org-cloud", { height: h }, x, z, 0);
      if (org) {
        org.position.y = y;
      }
    }
    // The end: the Cloudity mark rises over the lanes
    cloudity = model("cloudity-logo", { height: 2 }, 0, -2.5, 0, true);
    if (cloudity) {
      cloudity.position.y = 0.6;
      cloudity.visible = false;
    }
  }

  function showStatus(i, status) {
    const slot = statusSlots[i];
    if (!slot) {
      return;
    }
    const wanted = { ok: "pass", warn: "warn", fail: "fail" }[status];
    for (const [name, item] of Object.entries(slot)) {
      item.visible = name === wanted;
    }
  }

  const cloudityScale = cloudity ? cloudity.scale.x : 1;
  // Lane markers on the ground, lit under the guinea pig
  const markerGeometry = paint.geometry("w4-marker", () => new THREE.PlaneGeometry(1.9, 1.2));
  const markerOn = paint.plain(0xffb400, { transparent: true, opacity: 0.6, depthWrite: false });
  const markerOff = paint.plain(0xffffff, { transparent: true, opacity: 0.25, depthWrite: false });
  const markers = LANES.map((x) => {
    const marker = new THREE.Mesh(markerGeometry, markerOff);
    marker.rotation.x = -Math.PI / 2;
    marker.position.set(x, 0.02, PIG_Z);
    root.add(marker);
    return marker;
  });

  function sourceMaterial(text) {
    return paint.label("w4-source", text, { width: 1024, height: 176, size: 76, bg: SLDS.navy, fg: SLDS.white });
  }

  /* ---------- The Pull Request behind the guinea pig ---------- */

  const prCanvas = document.createElement("canvas");
  prCanvas.width = 1024;
  prCanvas.height = 420;
  const prTexture = new THREE.CanvasTexture(prCanvas);
  prTexture.colorSpace = THREE.SRGBColorSpace;
  prTexture.anisotropy = 4;
  const prMaterial = new THREE.MeshStandardMaterial({ map: prTexture, roughness: 0.6, emissive: 0x222222 });
  const prSide = paint.plain(0xc9c9c9);
  const pr = pictureBox(THREE, paint.geometry("w4-pr", () => new THREE.BoxGeometry(6.6, 2.7, 0.14)), prMaterial, prSide);
  pr.position.set(0, 0.75, 4.0);
  pr.rotation.x = -0.8;
  root.add(pr);
  const prView = {
    title: "US-016 Compute the customer tier from contacts",
    short: "Pull Request US-016",
    sub: t("prInto"),
    checks: [
      { name: "Simulate Deployment to Major Org", label: t("checkDeploy"), status: "run", note: t("running") },
      { name: "Mega-Linter", label: "Mega-Linter", status: "run", note: t("running") }
    ],
    box: "blocked"
  };

  function drawPr() {
    const c = prCanvas.getContext("2d");
    const w = prCanvas.width;
    const h = prCanvas.height;
    c.clearRect(0, 0, w, h);
    rounded(c, 4, 4, w - 8, h - 8, 22);
    c.fillStyle = SLDS.white;
    c.fill();
    c.lineWidth = 6;
    c.strokeStyle = SLDS.border;
    c.stroke();
    rounded(c, 26, 22, 76, 76, 14);
    c.fillStyle = prView.box === "merged" ? SLDS.purple : SLDS.success;
    c.fill();
    glyph(c, "branch", 64, 60, 70);
    c.fillStyle = SLDS.navy;
    c.textAlign = "left";
    c.textBaseline = "middle";
    fitText(c, prView.short, 122, 60, w - 150, 54, "800");
    c.fillStyle = SLDS.border;
    c.fillRect(26, 116, w - 52, 4);
    prView.checks.forEach((check, i) => {
      const y = 162 + i * 72;
      const colour = { ok: SLDS.success, fail: SLDS.error, warn: SLDS.warningDark, run: SLDS.grey }[check.status];
      c.beginPath();
      c.arc(60, y, 28, 0, Math.PI * 2);
      c.fillStyle = colour;
      c.fill();
      glyph(c, { ok: "check", fail: "error", warn: "warning", run: "loop" }[check.status], 60, y, 52);
      c.fillStyle = SLDS.text;
      c.textAlign = "left";
      fitText(c, check.label, 106, y, 560, 44, "800");
      c.fillStyle = colour;
      c.textAlign = "right";
      fitText(c, check.note, w - 36, y, 300, 38, "800");
    });
    const boxY = 300;
    rounded(c, 26, boxY, w - 52, 98, 14);
    c.fillStyle = prView.box === "ready" ? SLDS.success : prView.box === "merged" ? SLDS.purple : SLDS.error;
    c.fill();
    c.fillStyle = SLDS.white;
    c.textAlign = "center";
    const boxText = prView.box === "ready" ? t("readyShort") : prView.box === "merged" ? t("merged") : t("blockedShort");
    fitText(c, boxText, w / 2, boxY + 51, w - 100, 52, "800");
    prTexture.needsUpdate = true;
  }

  function setChecks(deploy, lint, box) {
    prView.checks[0].status = deploy[0];
    prView.checks[0].note = deploy[1];
    prView.checks[1].status = lint[0];
    prView.checks[1].note = lint[1];
    prView.box = box;
    drawPr();
    showStatus(0, deploy[0]);
    showStatus(1, lint[0]);
  }
  drawPr();

  /* ---------- The coverage meter at the top ---------- */

  const meter = document.createElement("div");
  meter.className = "gr-w4-meter";
  const meterLabel = document.createElement("strong");
  meterLabel.textContent = t("coverage");
  const bar = document.createElement("span");
  bar.className = "gr-w4-bar";
  const fill = document.createElement("i");
  bar.appendChild(fill);
  for (const [value, key] of [
    [COVERAGE_FLOOR, "floor"],
    [COVERAGE_TARGET, "target"]
  ]) {
    const mark = document.createElement("b");
    mark.className = "gr-w4-mark gr-w4-mark--" + key;
    mark.style.left = meterPosition(value) + "%";
    mark.title = t(key);
    const tag = document.createElement("em");
    tag.textContent = value + "%";
    mark.appendChild(tag);
    bar.appendChild(mark);
  }
  const meterValue = document.createElement("span");
  meterValue.className = "gr-w4-value";
  meter.append(meterLabel, bar, meterValue);
  hud.extra.appendChild(meter);

  let coverage = COVERAGE_LOOP;
  let shownCoverage = COVERAGE_LOOP;

  function meterPosition(value) {
    // 60% to 90%: the part of the scale where the two lines are
    return Math.max(0, Math.min(100, ((value - 60) / 30) * 100));
  }

  function renderMeter() {
    fill.style.width = meterPosition(shownCoverage) + "%";
    const state = shownCoverage < COVERAGE_FLOOR ? "low" : shownCoverage <= COVERAGE_TARGET ? "under" : "ok";
    meter.setAttribute("data-state", state);
    meterValue.textContent = (ctx.lang === "fr" ? shownCoverage.toFixed(2).replace(".", ",") + " %" : shownCoverage.toFixed(2) + "%");
    ctx.setData("coverage", coverage.toFixed(1));
  }
  renderMeter();

  /* ---------- The wave banner ---------- */

  const banner = document.createElement("div");
  banner.className = "gr-w4-banner";
  const bannerTitle = document.createElement("strong");
  const bannerSub = document.createElement("span");
  banner.append(bannerTitle, bannerSub);
  hud.layer.appendChild(banner);
  let bannerTime = 0;

  function showBanner(n) {
    bannerTitle.textContent = t("w" + n + "_title");
    bannerSub.textContent = t("w" + n + "_sub");
    banner.classList.add("is-shown");
    bannerTime = 2.8;
  }

  /* ---------- Findings, tests and the boss ---------- */

  const cardGeometry = paint.geometry("w4-card", () => new THREE.BoxGeometry(1.8, 0.62, 0.16));
  const footGeometry = paint.geometry("w4-foot", () => new THREE.BoxGeometry(0.16, 0.24, 0.16));
  const footMaterial = paint.plain(0x032d60);
  let objects = [];

  // A card face is a colour and a glyph: the words are on the sign above it
  function faceOf(kind) {
    const tone = TONES[KINDS[kind].tone];
    const words = KINDS[kind].face;
    return {
      face: paint.material(
        "w4-face:" + KINDS[kind].tone,
        256,
        80,
        (c, w, h) => {
          rounded(c, 2, 2, w - 4, h - 4, 18);
          c.fillStyle = tone.color;
          c.fill();
          glyph(c, tone.icon, 44, h / 2, 64, SLDS.white);
          if (words) {
            // The Dev's padding says what it is, big, on the card itself
            c.fillStyle = SLDS.white;
            c.textAlign = "center";
            c.textBaseline = "middle";
            fitText(c, words, 160, h / 2 + 2, 150, 60, "800", true);
            return;
          }
          c.fillStyle = "rgba(255,255,255,0.85)";
          for (const [y, len] of [
            [22, 150],
            [38, 110],
            [54, 130]
          ]) {
            rounded(c, 88, y, len, 8, 4);
            c.fill();
          }
        },
        { emissive: 0x202020, roughness: 0.4 }
      ),
      side: paint.plain(tone.side)
    };
  }

  function chipOf(kind) {
    const tone = TONES[KINDS[kind].tone];
    return paint.sign("w4-chip-" + kind, t("chip_" + kind), { color: tone.color, glyph: tone.icon, screen: true, height: engine.portrait ? 0.034 : 0.036 });
  }

  function spawn(kind, lane, options) {
    const def = KINDS[kind];
    const o = options || {};
    const look = faceOf(kind);
    const group = new THREE.Group();
    const card = pictureBox(THREE, cardGeometry, look.face, look.side);
    card.position.y = 0.66;
    group.add(card);
    const feet = [-0.45, 0.45].map((x) => {
      const foot = new THREE.Mesh(footGeometry, footMaterial);
      foot.position.set(x, 0.12, 0);
      group.add(foot);
      return foot;
    });
    if (engine.settings.shadows) {
      card.castShadow = true;
    }
    let coin = null;
    if (def.tone === "test") {
      // A real Apex test carries its flask
      const flask = ctx.models && ctx.models.get("apex-test", { height: 0.45, shadows: false });
      if (flask) {
        flask.position.y = 0.97;
        group.add(flask);
      }
    }
    if (def.tone === "golden") {
      // Victor's note, always the note
      coin = ctx.models && ctx.models.get("note", { height: 0.6, shadows: false });
      if (coin) {
        coin.position.y = 1.9;
        group.add(coin);
      }
    }
    // Three words at most, readable at any distance; it shows as the card comes near
    const chip = chipOf(kind);
    chip.position.y = 1.35;
    chip.visible = false;
    group.add(chip);
    const z = o.z !== undefined ? o.z : SPAWN_Z;
    group.position.set(LANES[lane], 0, z);
    root.add(group);
    const object = { kind, def, lane, z, hp: def.hp || 1, age: 0, cloned: Boolean(o.clone), label: o.label, title: def.title || t("chip_" + kind), mesh: group, card, chip, coin, feet, dying: 0, dead: false, flash: 0, phase: random() * 6 };
    objects.push(object);
    return object;
  }

  // The boss: a big System.LimitException counting accounts
  const bossCanvas = document.createElement("canvas");
  bossCanvas.width = 768;
  bossCanvas.height = 300;
  const bossTexture = new THREE.CanvasTexture(bossCanvas);
  bossTexture.colorSpace = THREE.SRGBColorSpace;
  const bossFace = new THREE.MeshStandardMaterial({ map: bossTexture, roughness: 0.5, emissive: 0x222222 });
  const boss = { group: new THREE.Group(), lane: 1, x: 0, hp: BOSS_HP, count: 0, shown: -1, active: false, dead: false, nextMove: 3, nextShot: 1.5, flash: 0, dying: 0 };
  {
    const body = pictureBox(THREE, paint.geometry("w4-boss", () => new THREE.BoxGeometry(3.3, 1.3, 0.24)), bossFace, paint.plain(0xba0517));
    body.position.y = 1.35;
    boss.group.add(body);
    boss.body = body;
    for (const x of [-1, 1]) {
      const leg = new THREE.Mesh(paint.geometry("w4-boss-leg", () => new THREE.BoxGeometry(0.3, 0.7, 0.3)), footMaterial);
      leg.position.set(x, 0.35, 0);
      boss.group.add(leg);
    }
    const back = new THREE.Mesh(paint.geometry("w4-hp-back", () => new THREE.PlaneGeometry(3.2, 0.22)), paint.plain(0x032d60, { emissive: 0x032d60 }));
    back.position.set(0, 2.25, 0.02);
    boss.group.add(back);
    const front = new THREE.Mesh(paint.geometry("w4-hp", () => new THREE.PlaneGeometry(3.1, 0.14).translate(1.55, 0, 0)), paint.plain(0xea001e, { emissive: 0xea001e, emissiveIntensity: 0.6 }));
    front.position.set(-1.55, 2.25, 0.03);
    boss.group.add(front);
    boss.bar = front;
    boss.group.visible = false;
    boss.group.position.set(0, 0, -10.5);
    boss.group.scale.setScalar(BOSS_SCALE);
    root.add(boss.group);
  }

  function drawBoss() {
    const n = Math.floor(boss.count);
    if (n === boss.shown) {
      return;
    }
    boss.shown = n;
    const c = bossCanvas.getContext("2d");
    const w = bossCanvas.width;
    const h = bossCanvas.height;
    c.clearRect(0, 0, w, h);
    rounded(c, 4, 4, w - 8, h - 8, 24);
    c.fillStyle = SLDS.error;
    c.fill();
    c.fillStyle = SLDS.white;
    c.textAlign = "center";
    c.textBaseline = "middle";
    fitText(c, t("bossFace"), w / 2, 62, w - 60, 72, "800");
    fitText(c, n + " / " + SOQL_LIMIT, w / 2, 160, w - 60, 96, "800");
    rounded(c, 30, 230, w - 60, 44, 12);
    c.fillStyle = "rgba(255,255,255,0.3)";
    c.fill();
    rounded(c, 30, 230, Math.max(24, ((w - 60) * n) / SOQL_LIMIT), 44, 12);
    c.fillStyle = n > 80 ? SLDS.warning : SLDS.white;
    c.fill();
    bossTexture.needsUpdate = true;
  }

  /* ---------- Fixes and the bits they knock off ---------- */

  const throwGeometry = paint.geometry("w4-throw", () => new THREE.BoxGeometry(0.46, 0.46, 0.08));
  const throwMaterial = paint.tile("w4-fix", SLDS.brand, "apex");
  const throws = [];
  for (let i = 0; i < 8; i++) {
    const mesh = new THREE.Mesh(throwGeometry, throwMaterial);
    mesh.visible = false;
    root.add(mesh);
    throws.push({ mesh, live: false, lane: 0, z: 0 });
  }
  // Confetti in the colours of what was hit
  const BURST_COLOURS = {
    warning: [0x706e6b, 0xc9c9c9, 0xffffff],
    error: [0xea001e, 0xff5d2d, 0xffb400, 0xffffff],
    test: [0x2e844a, 0x45c65a, 0xffb400, 0x1b96ff],
    fake: [0x8aa594, 0xc9c9c9],
    golden: [0xffb400, 0xf2c94c, 0xffffff, 0xe3066a],
    padding: [0xdd7a01, 0xfe9339, 0xffffff]
  };

  function burst(x, y, z, tone, count) {
    ctx.fx.burst(x, y, z, { count: count * 2, colors: BURST_COLOURS[tone] || BURST_COLOURS.error, speed: 3.5, up: 4, life: 0.8 });
  }

  /* ---------- The run ---------- */

  const player = { lane: 1, x: 0, hop: 0, cooldown: 0, stun: 0, moving: 0 };
  let phase = "battle";
  let wave = 0;
  let waveTime = 0;
  let queue = [];
  let clock = 0;
  let shake = 0;
  let warningsShot = 0;
  let goldenSpawned = 0;
  let goldenFound = false;
  let testCursor = 0;
  let later = [];
  let review = null;
  let testPasses = 0;
  // What the player missed, said on the result screen
  const missed = [];
  const seenDetail = {};
  let cloudRise = 0;
  // The findings march faster as the world goes on, never with time spent stuck
  let pace = 1;
  let mercy = 0;
  let paceStep = 0;

  ctx.setData("lane", player.lane);
  ctx.setData("review", "pending");
  ctx.setData("wave", 0);
  ctx.setData("pace", "1.00");

  let lastCoach = -10;
  /** A big instruction in the middle, never more than one every 3 seconds. */
  function coach(key, force) {
    // At the Dev the goal line says it: a big line in the middle would hide him
    if (phase === "dev") {
      return;
    }
    if (force || clock - lastCoach > 3) {
      lastCoach = clock;
      hud.coach(t(key), 2600);
    }
  }

  function after(seconds, run) {
    later.push({ at: clock + seconds, run });
  }

  function pickLane(previous) {
    let lane = Math.floor(random() * 3);
    if (lane === previous && random() < 0.6) {
      lane = (lane + 1 + Math.floor(random() * 2)) % 3;
    }
    return lane;
  }

  function startWave(n) {
    wave = n;
    waveTime = 0;
    queue = [];
    ctx.setData("wave", n);
    hud.setPath([t("p1"), t("p2"), t("p3"), t("p4"), t("p5"), t("p6")], n - 1);
    showBanner(n);
    // On a phone the review panel says it itself, under the top bar
    hud.goal(n === 5 && engine.portrait ? "" : t("goal" + n));
    // The review has its own steps on the panel: no big coach over it
    if (n < 5) {
      after(2.9, () => coach("coach" + n, true));
    }
    let lane = 1;
    if (n === 1) {
      source.material = sourceMaterial("Mega-Linter");
      setChecks(["ok", "81%"], ["warn", t("noteWarnings")], "ready");
      hud.tick("Mega-Linter: Success with warnings");
      for (let i = 0; i < 7; i++) {
        lane = pickLane(lane);
        queue.push({ at: 1.2 + i * 1.9, kind: WARNINGS[i % WARNINGS.length], lane });
      }
    } else if (n === 2) {
      setChecks(["ok", "81%"], ["fail", t("noteErrors")], "blocked");
      hud.tick("(Moderate)  pmd:OperationWithLimitsInLoop  force-app/main/default/classes/AccountTierService.cls");
      const order = ["loop", "warnDoc", "loop", "required", "warnTrivy", "loop", "warnDebug", "required", "loop", "warnActions", "loop"];
      order.forEach((kind, i) => {
        lane = pickLane(lane);
        queue.push({ at: 1 + i * 2, kind, lane });
      });
      // Victor's note: one golden finding, fast, in the middle of the wave
      queue.push({ at: 11.6, kind: "golden", lane: (lane + 1) % 3 });
      queue.sort((a, b) => a.at - b.at);
    } else if (n === 3) {
      source.material = sourceMaterial("Account x 101");
      boss.active = true;
      boss.group.visible = true;
      boss.hp = BOSS_HP;
      boss.count = 0;
      boss.shown = -1;
      boss.nextMove = 3;
      boss.nextShot = 1.4;
      drawBoss();
      hud.tick("for (Account acc : accounts) { [SELECT ... FROM Contact WHERE AccountId = :acc.Id] }");
      hud.toast("System.LimitException: Too many SOQL queries: 101", "bad");
    } else if (n === 4) {
      source.material = sourceMaterial("AccountTierServiceTest.cls");
      queueTests(0.8);
    } else if (n === 5) {
      openReview();
    }
  }

  // Tests come until the coverage is over the target: a missed one comes round again
  function queueTests(from) {
    testPasses += 1;
    const pattern = ["test", "fake", "test", "test", "fake", "test", "test", "fake"];
    let lane = player.lane;
    pattern.forEach((kind, i) => {
      lane = pickLane(lane);
      const entry = { at: waveTime + from + i * 1.55, kind, lane };
      if (kind === "test") {
        entry.label = TEST_NAMES[testCursor % TEST_NAMES.length];
        testCursor += 1;
      }
      queue.push(entry);
    });
    if (!goldenFound && goldenSpawned < 2) {
      queue.push({ at: waveTime + from + 5.4, kind: "golden", lane: pickLane(lane) });
    }
    queue.sort((a, b) => a.at - b.at);
  }

  function liveObjects() {
    return objects.filter((o) => !o.dead && !o.dying);
  }

  /** How far the battle is, 0 to 1: by wave, and inside a wave by what is done. */
  function progress() {
    const clamp = (v) => Math.max(0, Math.min(1, v));
    if (wave <= 1) {
      return 0.15 * clamp(waveTime / 15.5);
    }
    if (wave === 2) {
      return 0.15 + 0.35 * clamp(waveTime / 28);
    }
    if (wave === 3) {
      return 0.5 + 0.25 * clamp(1 - boss.hp / BOSS_HP);
    }
    if (wave === 4) {
      const covered = clamp((coverage - COVERAGE_FIXED) / (COVERAGE_TARGET - COVERAGE_FIXED));
      return 0.75 + 0.25 * Math.max(covered, clamp(waveTime / 30));
    }
    return 1;
  }

  function updatePace(dt) {
    const p = progress();
    // Ease in: gentle for a long time, then the climb
    const target = Math.max(0.85, 1 + PACE_GAIN * Math.pow(p, 1.6) - mercy);
    mercy = Math.max(0, mercy - MERCY_FADE * dt);
    pace += (target - pace) * Math.min(1, dt * 0.8);
    ctx.setData("pace", pace.toFixed(2));
    const step = Math.floor((pace - 1) / 0.1 + 1e-6);
    if (step > paceStep) {
      paceStep = step;
      coach("faster", true);
      ctx.sound.play("power");
    }
  }

  function updateWave(dt) {
    // A little denser too: the queue runs a bit faster than the clock
    waveTime += dt * (1 + (pace - 1) * 0.35);
    while (queue.length && queue[0].at <= waveTime) {
      const entry = queue.shift();
      if (entry.kind === "golden") {
        goldenSpawned += 1;
      }
      spawn(entry.kind, entry.lane, { label: entry.label });
    }
    const live = liveObjects();
    if (wave === 1 && !queue.length && waveTime > 15.5) {
      if (!warningsShot) {
        ctx.collect(100, t("warnLesson"));
      } else {
        hud.toast(t("warnLesson"), "good");
      }
      startWave(2);
    } else if (wave === 2 && !queue.length && !live.some((o) => o.def.tone === "error")) {
      startWave(3);
    } else if (wave === 4 && !queue.length && coverage <= COVERAGE_TARGET) {
      if (testPasses < 2) {
        queueTests(0.6);
      } else if (!live.some((o) => o.def.tone === "test" || o.def.tone === "fake")) {
        // The coverage never blocks the end: what is short goes in the result
        missed.push(t("missedCoverage", { coverage: coverage.toFixed(2) }));
        ctx.points(-100);
        endBattle();
      }
    }
  }

  function updateBoss(dt) {
    if (!boss.active) {
      return;
    }
    if (boss.dying > 0) {
      boss.dying -= dt;
      boss.group.scale.setScalar(Math.max(0.01, (boss.dying / 0.6) * BOSS_SCALE));
      boss.group.rotation.z += dt * 6;
      if (boss.dying <= 0) {
        boss.active = false;
        boss.group.visible = false;
      }
      return;
    }
    boss.count += dt * BOSS_COUNT_RATE * (1 + (pace - 1) * 0.5);
    if (boss.count >= SOQL_LIMIT) {
      boss.count = 0;
      shake = 0.5;
      hud.tick("System.LimitException: Too many SOQL queries: 101");
      ctx.loseAttempt(t("limitHit"), t("tip_limit"));
      mercy = MERCY;
      if (!ctx.playing) {
        return;
      }
    }
    drawBoss();
    boss.nextMove -= dt;
    if (boss.nextMove <= 0) {
      boss.lane = (boss.lane + 1 + Math.floor(random() * 2)) % 3;
      boss.nextMove = 2.6 + random() * 1.4;
    }
    boss.nextShot -= dt * (1 + (pace - 1) * 0.35);
    if (boss.nextShot <= 0) {
      spawn("select", random() < 0.65 ? boss.lane : Math.floor(random() * 3), { z: boss.group.position.z + 1 });
      boss.nextShot = 2 + random() * 0.9;
    }
    boss.x += (LANES[boss.lane] - boss.x) * Math.min(1, dt * 4);
    boss.flash = Math.max(0, boss.flash - dt);
    boss.group.position.x = boss.x;
    boss.group.position.y = Math.abs(Math.sin(clock * 3)) * 0.12;
    boss.group.rotation.z = Math.sin(clock * 3) * 0.04;
    boss.body.scale.setScalar(1 + boss.flash * 0.6);
    boss.bar.scale.x = Math.max(0.001, boss.hp / BOSS_HP);
  }

  function hitBoss() {
    boss.hp -= 1;
    boss.flash = 0.15;
    shake = 0.15;
    burst(boss.x, 2, boss.group.position.z + 0.4, "error", 6);
    if (boss.hp > 0) {
      ctx.collect(40, boss.hp % 4 === 0 ? t("bossHit") : "");
      return;
    }
    boss.dying = 0.6;
    shake = 0.6;
    burst(boss.x, 2, boss.group.position.z + 0.4, "error", 18);
    ctx.sound.play("happy");
    ctx.fx.burst(boss.x, 2, boss.group.position.z + 0.5, { count: 70, speed: 6, up: 6, life: 1.4 });
    ctx.collect(400, t("bossDown"));
    // Every query in a loop goes with it
    for (const o of liveObjects()) {
      if (o.kind === "select") {
        kill(o, false);
      }
    }
    hud.tick("Map<Id, List<Contact>> contactsByAccount = new Map<Id, List<Contact>>();");
    setChecks(["run", t("running")], ["ok", t("passing")], "blocked");
    after(1.4, () => {
      coverage = COVERAGE_FIXED;
      setChecks(["fail", "76.92%"], ["ok", t("passing")], "blocked");
      hud.tick("[sfdx-hardis][apextest] Test run code coverage (org wide) 76.92% should be greater than 80%");
      hud.toast(t("coverageDrop"), "bad");
      ctx.sound.play("wrong");
    });
    after(3.6, () => startWave(4));
  }

  function kill(o, scored) {
    o.dying = 0.3;
    burst(LANES[o.lane], 0.7, o.z, o.def.tone, scored ? 10 : 5);
  }

  /** A fix hits object o. */
  function hit(o) {
    const tone = o.def.tone;
    if (tone === "warning") {
      warningsShot += 1;
      player.stun = WASTED_STUN;
      kill(o, false);
      ctx.points(-20);
      ctx.sound.play("wrong");
      hud.toast(t("warnShot"), "bad");
      coach("coachWarn");
      return;
    }
    if (tone === "test") {
      kill(o, false);
      ctx.points(-30);
      ctx.sound.play("wrong");
      hud.toast(t("testShot"), "bad");
      coach("coachTestShot");
      return;
    }
    if (tone === "fake") {
      kill(o, true);
      ctx.collect(30, t("fakeShot"));
      return;
    }
    if (tone === "padding") {
      kill(o, true);
      dev.stopped += 1;
      ctx.sound.play("w4Squash");
      ctx.collect(o.def.points, dev.stopped === 1 ? t("fix_ipp") : "");
      renderDevBar();
      setDevData();
      return;
    }
    if (tone === "golden") {
      kill(o, true);
      goldenFound = true;
      ctx.collect(150, t("goldenTitle"));
      ctx.foundNote();
      return;
    }
    o.hp -= 1;
    o.flash = 0.15;
    if (o.hp > 0) {
      ctx.points(10);
      ctx.sound.play("click");
      burst(LANES[o.lane], 0.7, o.z, tone, 4);
      return;
    }
    kill(o, true);
    player.hop = 0.22;
    if (pig.hop) {
      pig.hop();
    }
    ctx.collect(o.def.points || 50, t(o.def.fix));
    // The full message of a finding, once, the first time one is stopped
    if (!seenDetail[o.kind]) {
      seenDetail[o.kind] = true;
      hud.tick(o.def.title.replace(/\s+/g, " ") + "  " + o.def.detail);
    }
  }

  function throwFix() {
    if (player.cooldown > 0 || player.stun > 0) {
      return;
    }
    const slot = throws.find((s) => !s.live);
    if (!slot) {
      return;
    }
    player.cooldown = THROW_COOLDOWN;
    player.hop = 0.22;
    slot.live = true;
    slot.lane = player.lane;
    slot.z = PIG_Z - 0.6;
    slot.mesh.visible = true;
    slot.mesh.position.set(LANES[player.lane], 0.75, slot.z);
    ctx.sound.play("click");
  }

  function updateThrows(dt) {
    for (const slot of throws) {
      if (!slot.live) {
        continue;
      }
      const from = slot.z;
      slot.z -= THROW_SPEED * dt;
      slot.mesh.position.z = slot.z;
      slot.mesh.rotation.z += dt * 14;
      // The first thing of the lane between where it was and where it is
      let target = null;
      for (const o of objects) {
        if (o.dead || o.dying || o.lane !== slot.lane || o.z > from + 0.5 || o.z < slot.z - 0.5) {
          continue;
        }
        if (!target || o.z > target.z) {
          target = o;
        }
      }
      const bossZ = boss.group.position.z;
      const bossInWay = boss.active && !boss.dying && Math.abs(boss.x - LANES[slot.lane]) < 1.2 && bossZ <= from + 0.3 && bossZ >= slot.z - 0.3;
      const devInWay = dev.state === "fight" && dev.guard <= 0 && Math.abs(dev.x - LANES[slot.lane]) < 1.1 && dev.z <= from + 0.3 && dev.z >= slot.z - 0.3;
      if (target) {
        slot.live = false;
        slot.mesh.visible = false;
        hit(target);
      } else if (bossInWay) {
        slot.live = false;
        slot.mesh.visible = false;
        hitBoss();
      } else if (devInWay) {
        slot.live = false;
        slot.mesh.visible = false;
        hitDev();
      } else if (slot.z < SPAWN_Z - 2) {
        slot.live = false;
        slot.mesh.visible = false;
      }
    }
  }

  function updateObjects(dt) {
    for (const o of objects) {
      if (o.dead) {
        continue;
      }
      if (o.dying) {
        o.dying -= dt;
        const s = Math.max(0.01, o.dying / 0.3);
        o.mesh.scale.set(s * 1.2, s, s);
        o.chip.visible = false;
        o.mesh.rotation.y += dt * 12;
        if (o.dying <= 0) {
          o.dead = true;
          root.remove(o.mesh);
        }
        continue;
      }
      o.age += dt;
      o.z += o.def.speed * pace * dt;
      o.flash = Math.max(0, o.flash - dt);
      o.mesh.position.z = o.z;
      o.chip.visible = o.z > -15;
      // A march: the card sways, the feet step
      const step = Math.sin(clock * 9 + o.phase);
      o.card.rotation.z = step * 0.05;
      o.card.position.y = 0.66 + Math.abs(step) * 0.06;
      o.card.scale.setScalar(1 + o.flash * 1.5);
      o.feet[0].position.z = step * 0.12;
      o.feet[1].position.z = -step * 0.12;
      if (o.def.tone === "golden") {
        o.card.rotation.y = Math.sin(clock * 5) * 0.4;
        if (o.coin) {
          o.coin.rotation.y = clock * 4;
        }
      }
      // A query in a loop runs again behind itself, while it lives
      if (o.def.clones && !o.cloned && o.age > CLONE_AFTER && o.z < -4) {
        o.cloned = true;
        spawn(o.kind, o.lane, { z: o.z - 2.2, clone: true });
        hud.tick(t("loopAgain"));
      }
      const tone = o.def.tone;
      if ((tone === "test" || tone === "fake") && o.z >= PIG_Z - 0.6 && o.z <= PIG_Z + 0.7 && Math.abs(player.x - LANES[o.lane]) < 1.25) {
        catchTest(o);
        continue;
      }
      if (o.z >= PR_LINE) {
        reachPr(o);
        if (!ctx.playing) {
          return;
        }
      }
    }
    objects = objects.filter((o) => !o.dead);
  }

  function catchTest(o) {
    o.dead = true;
    root.remove(o.mesh);
    if (o.def.tone === "fake") {
      burst(player.x, 0.8, PIG_Z, "fake", 6);
      ctx.points(-40);
      ctx.sound.play("wrong");
      hud.toast(t("fakeCaught"), "bad");
      coach("coachFake");
      return;
    }
    burst(player.x, 0.8, PIG_Z, "test", 10);
    coverage = Math.min(99, Math.round((coverage + COVERAGE_PER_TEST) * 100) / 100);
    ctx.sound.play("wheek");
    ctx.collect(60, t("testCaught", { name: o.label }));
    setChecks(coverage > COVERAGE_TARGET ? ["ok", coverage.toFixed(2) + "%"] : ["fail", coverage.toFixed(2) + "%"], ["ok", t("passing")], coverage > COVERAGE_TARGET ? "ready" : "blocked");
    if (coverage > COVERAGE_TARGET && wave === 4) {
      endBattle();
    }
  }

  function reachPr(o) {
    o.dead = true;
    root.remove(o.mesh);
    const tone = o.def.tone;
    if (tone === "warning") {
      ctx.points(10);
      hud.tick(t("warnPassed"));
      return;
    }
    if (tone === "golden") {
      hud.tick(t("goldenPassed"));
      return;
    }
    if (tone === "padding") {
      // Points, never an attempt: the result says how many got in
      dev.letIn += 1;
      ctx.points(-20);
      ctx.sound.play("wrong");
      burst(LANES[o.lane], 0.8, PR_LINE + 0.6, "padding", 5);
      if (dev.letIn === 1) {
        hud.toast(t("ippIn"), "bad");
        hud.tick("AccountTierServiceTest.cls: i++; i++; i++;");
      }
      devSay("devGloat", true);
      renderDevBar();
      setDevData();
      return;
    }
    if (tone === "error") {
      shake = 0.4;
      pig.hitWobble(0.6);
      burst(LANES[o.lane], 0.8, PR_LINE + 0.6, "error", 8);
      lose(t("errorReached", { finding: t("chip_" + o.kind) }), t(o.def.tip));
      coach("coachError");
      // Mercy: the pace drops a notch for a few seconds, then climbs again
      mercy = MERCY;
    }
  }

  /**
   * A mistake that costs an attempt. Out of attempts at the Dev, the card says
   * the next try starts at him.
   */
  function lose(title, tip) {
    const atDev = phase === "dev";
    const last = atDev && ctx.attempts <= 1;
    if (ctx.loseAttempt(title, last ? tip + " " + t("retryHint") : tip) <= 0 && atDev) {
      devRetryAt = Date.now();
      speech.hide();
    }
  }

  function endBattle() {
    phase = "between";
    for (const o of liveObjects()) {
      kill(o, false);
    }
    queue = [];
    ctx.sound.play("gate");
    ctx.fx.burst(0, 1.2, 3.2, { count: 50, speed: 5, up: 6, life: 1.4 });
    const short = coverage <= COVERAGE_TARGET;
    hud.toast(short ? t("coverageShort") : t("checksGreen"), short ? "bad" : "good");
    hud.tick("Simulate Deployment to Major Org: " + coverage.toFixed(2) + "%");
    after(1.6, () => {
      prView.box = "merged";
      drawPr();
      if (short) {
        hud.toast(t("ownMerged"), "good");
      } else {
        ctx.collect(200, t("ownMerged"));
      }
    });
    after(3.6, () => startWave(5));
  }

  /* ---------- The finale: Mariia's Pull Request ---------- */

  function openReview() {
    phase = "review";
    prView.title = "US-052 Delivery date on opportunities";
    prView.short = "Pull Request US-052";
    prView.sub = t("mariiaInto");
    source.material = sourceMaterial("US-052");
    setChecks(["ok", t("passing")], ["ok", t("passing")], "ready");
    hud.setPads([]);
    // The review needs the room: the coverage is done with, and on a phone
    // the messages go under the top bar, off the review's buttons
    meter.hidden = true;
    ctx.setData("messages", "top");
    hud.chat("mariia", t("mariia_open"), 5000);
    review = buildReview();
    ctx.setData("review", "pending");
  }

  function el(tag, cls, parent, text) {
    const node = document.createElement(tag);
    if (cls) {
      node.className = cls;
    }
    if (text !== undefined) {
      node.textContent = text;
    }
    if (parent) {
      parent.appendChild(node);
    }
    return node;
  }

  function buildReview() {
    const state = { found: false, wrong: 0, merges: 0, done: false, step: 1 };
    const tipsShown = {};
    const panel = el("div", "gr-w4-review gr-scroll", hud.layer);
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "US-052");
    const head = el("div", "gr-w4-head", panel);
    el("span", "gr-w4-prtile", head, "PR");
    const titles = el("div", "", head);
    el("strong", "", titles, "US-052 Delivery date on opportunities");
    el("span", "", titles, t("mariiaInto"));
    const checks = el("div", "gr-w4-checks", head);
    const checkNodes = ["Simulate Deployment to Major Org", "Mega-Linter"].map((name) => el("span", "gr-w4-check is-ok", checks, name));

    // The three steps, always in sight; the current one is lit
    const steps = el("ol", "gr-w4-steps", panel);
    const stepNodes = ["review_step1", "review_step2", "review_step3"].map((key) => el("li", "", steps, t(key)));
    function setStep(n) {
      state.step = n;
      stepNodes.forEach((node, i) => node.setAttribute("data-state", i + 1 < n ? "done" : i + 1 === n ? "now" : "todo"));
      hud.goal(engine.portrait ? "" : t(["goal5", "goal5drag", "goal5b"][n - 1]));
    }

    // What a reviewer looks for, from the lab, and what Mariia wrote
    el("p", "gr-w4-lab", panel, t("review_lab"));
    const desc = el("p", "gr-w4-desc", panel);
    el("strong", "", desc, t("review_descTitle") + " ");
    el("span", "", desc, t("review_desc"));

    // The review comment to drag onto the line of the field that is gone
    const dockRow = el("div", "gr-w4-dockrow", panel);
    el("p", "gr-w4-task", dockRow, t("review_task"));
    const dock = el("div", "gr-w4-dock", dockRow);
    const card = el("button", "gr-w4-card", dock);
    card.type = "button";
    el("strong", "", card, t("review_card"));
    el("span", "", card, t("review_cardHint"));
    const comment = el("blockquote", "gr-w4-comment", null);
    el("strong", "", comment, t("review_card"));
    el("span", "", comment, t("comment"));

    const diff = el("div", "gr-w4-diff", panel);

    const before = el("div", "gr-w4-side gr-w4-before", diff);
    el("span", "gr-w4-ltitle", before, t("review_before"));
    const beforeCols = el("div", "gr-w4-cols", before);
    const beforeCol = el("div", "gr-w4-col", beforeCols);
    const beforeEmpty = el("div", "gr-w4-col gr-w4-col2", beforeCols);
    el("span", "gr-w4-c2", beforeEmpty, t("review_column2"));
    el("span", "gr-w4-empty", beforeEmpty, t("review_empty"));
    const rows = [];
    for (const [label, api] of LAYOUT) {
      // Every line of Before is a drop zone, and a button for taps and keys
      const row = el("button", "gr-w4-field gr-w4-drop", beforeCol);
      row.type = "button";
      el("span", "", row, label);
      if (api === MOVED) {
        el("em", "gr-w4-arrow", row, t("review_movedShort"));
      }
      row.title = api;
      row.setAttribute("data-field", api);
      row.addEventListener("click", () => drop(api, row));
      rows.push(row);
    }

    const afterSide = el("div", "gr-w4-side gr-w4-after", diff);
    el("span", "gr-w4-ltitle", afterSide, t("review_after"));
    const afterCols = el("div", "gr-w4-cols", afterSide);
    const afterCol = el("div", "gr-w4-col", afterCols);
    const afterCol2 = el("div", "gr-w4-col gr-w4-col2", afterCols);
    for (const [label, api] of LAYOUT) {
      if (api !== MOVED && api !== DROPPED) {
        const cell = el("span", "gr-w4-field is-static", afterCol);
        el("span", "", cell, label);
        cell.title = api;
      }
    }
    el("span", "gr-w4-c2", afterCol2, t("review_column2"));
    const capCell = el("span", "gr-w4-field is-static is-moved", afterCol2);
    el("em", "gr-w4-arrow", capCell, t("review_movedIn"));
    el("span", "", capCell, "Close Date");
    capCell.title = MOVED;
    // What US-052 is about: the new field, next to the close date
    const newCell = el("span", "gr-w4-field is-static", afterCol2);
    el("em", "gr-w4-arrow", newCell, t("review_new"));
    el("span", "", newCell, "Delivery Date");
    newCell.title = "Delivery_Date__c";

    const actions = el("div", "gr-w4-actions", panel);
    const hint = el("p", "gr-w4-hint", actions, t("request_hint"));
    const requestButton = el("button", "gr-button gr-w4-request", actions, "Request changes");
    requestButton.type = "button";
    requestButton.disabled = true;
    const mergeBox = el("div", "gr-w4-mergebox", actions);
    const mergeButton = el("button", "gr-button gr-w4-merge", mergeBox, "Squash and merge");
    mergeButton.type = "button";
    el("span", "gr-w4-trap", mergeBox, t("mergeCaption"));
    const merged = el("div", "gr-w4-merged", panel);
    merged.hidden = true;
    el("strong", "", merged, t("merged"));
    el("span", "", merged, t("mergedBody"));
    const restoreButton = el("button", "gr-button", merged, "Restore branch");
    restoreButton.type = "button";

    /* ---- Drag and drop, with the pointer: mouse, pen or finger ---- */
    let drag = null;
    const ghost = el("div", "gr-w4-ghost", null, t("review_card"));

    function rowAt(x, y) {
      const hit = document.elementFromPoint(x, y);
      const row = hit && hit.closest ? hit.closest(".gr-w4-drop") : null;
      return row && !row.disabled && panel.contains(row) ? row : null;
    }

    function hover(row) {
      for (const r of rows) {
        r.classList.toggle("is-over", r === row);
      }
    }

    // Near the top or the bottom of the panel, the list scrolls by itself
    function autoScroll() {
      if (!drag) {
        return;
      }
      const box = panel.getBoundingClientRect();
      // The bottom of the list is the top of the sticky buttons
      const bottom = actions.hidden ? box.bottom : actions.getBoundingClientRect().top;
      const edge = 28;
      if (drag.y < box.top + edge) {
        panel.scrollTop -= 6;
      } else if (drag.y > bottom - edge) {
        panel.scrollTop += 6;
      }
      hover(rowAt(drag.x, drag.y));
      drag.frame = window.requestAnimationFrame(autoScroll);
    }

    card.addEventListener("pointerdown", (event) => {
      if (state.found || state.done) {
        return;
      }
      event.preventDefault();
      card.setPointerCapture(event.pointerId);
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false, frame: 0 };
      ghost.style.left = event.clientX + "px";
      ghost.style.top = event.clientY + "px";
      hud.layer.appendChild(ghost);
      card.classList.add("is-lifted");
      if (state.step < 2) {
        setStep(2);
      }
      drag.frame = window.requestAnimationFrame(autoScroll);
    });
    card.addEventListener("pointermove", (event) => {
      if (!drag || event.pointerId !== drag.id) {
        return;
      }
      drag.x = event.clientX;
      drag.y = event.clientY;
      drag.moved = true;
      ghost.style.left = event.clientX + "px";
      ghost.style.top = event.clientY + "px";
    });
    function endDrag(event, cancelled) {
      if (!drag || event.pointerId !== drag.id) {
        return;
      }
      window.cancelAnimationFrame(drag.frame);
      const row = cancelled ? null : rowAt(event.clientX, event.clientY);
      const wasMoved = drag.moved;
      drag = null;
      ghost.remove();
      card.classList.remove("is-lifted");
      hover(null);
      if (row) {
        drop(row.getAttribute("data-field"), row);
      } else if (!wasMoved) {
        // A tap on the card: say how it works, and send the focus to the lines
        hud.toast(t("coach5drag"), "good");
        rows.find((r) => !r.disabled).focus();
      }
    }
    card.addEventListener("pointerup", (event) => endDrag(event, false));
    card.addEventListener("pointercancel", (event) => endDrag(event, true));
    // Keys: Enter on the card moves to the lines, Enter on a line drops the comment there
    card.addEventListener("click", (event) => {
      if (event.detail === 0) {
        setStep(Math.max(state.step, 2));
        rows.find((r) => !r.disabled).focus();
      }
    });

    function drop(api, row) {
      if (state.found || state.done) {
        return;
      }
      if (state.step < 2) {
        setStep(2);
      }
      if (api === DROPPED) {
        state.found = true;
        row.classList.add("is-found");
        el("em", "gr-w4-missing", row, t("review_missing"));
        // The comment opens with the buttons, so it is never scrolled away
        actions.prepend(comment);
        actions.classList.add("is-found");
        card.hidden = true;
        ctx.sound.play("wheek");
        ctx.collect(150, t("pick_found"));
        hint.hidden = true;
        requestButton.disabled = false;
        requestButton.focus({ preventScroll: true });
        row.scrollIntoView({ block: "nearest" });
        setStep(3);
        return;
      }
      // A wrong line shakes, says why once, and cannot be chosen again
      state.wrong += 1;
      row.classList.add("is-wrong", "is-shake");
      window.setTimeout(() => row.classList.remove("is-shake"), 500);
      row.disabled = true;
      if (state.wrong >= 2) {
        // A hint rather than a wall: the line that goes is marked
        rows.find((r) => r.getAttribute("data-field") === DROPPED).classList.add("is-hint");
      }
      ctx.points(-10);
      ctx.sound.play("wrong");
      const key = api === MOVED ? "pick_moved" : api === REQUIRED ? "pick_required" : "pick_still";
      if (!tipsShown[key] && hud.tip) {
        tipsShown[key] = true;
        hud.tip(t(key), 4000);
      } else {
        hud.toast(t(key), "bad");
      }
    }

    requestButton.addEventListener("click", () => {
      if (!state.found || state.done) {
        return;
      }
      state.done = true;
      ctx.setData("review", "changes");
      hud.goal("");
      ctx.fx.burst(player.x, 1.2, PIG_Z, { count: 60, speed: 5, up: 6, life: 1.4 });
      ctx.sound.play("happy");
      requestButton.disabled = true;
      mergeButton.disabled = true;
      ctx.sound.play("gate");
      ctx.points(200);
      hud.toast("Request changes", "good");
      stepNodes[2].setAttribute("data-state", "done");
      for (const row of rows) {
        row.disabled = true;
      }
      // Mariia answers on the same branch, and the checks run again
      after(1.2, () => {
        hud.chat("mariia", t("mariia_fix"), 6000);
        const back = el("span", "gr-w4-field is-static is-back", afterCol2);
        el("span", "", back, "Next Step");
        // Back where it was asked: under Close Date
        afterCol2.insertBefore(back, capCell.nextSibling);
        back.title = DROPPED;
        hud.tick(t("rerun"));
        for (const node of checkNodes) {
          node.className = "gr-w4-check is-run";
        }
        setChecks(["run", t("running")], ["run", t("running")], "blocked");
      });
      after(3.2, () => {
        for (const node of checkNodes) {
          node.className = "gr-w4-check is-ok";
        }
        setChecks(["ok", t("passing")], ["ok", t("passing")], "ready");
      });
      after(4.4, () => {
        prView.box = "merged";
        drawPr();
        hud.toast(t("fixMerged"), "good");
        // The review is done: the panel steps aside, the lanes are back
        panel.hidden = true;
        ctx.fx.burst(0, 2, -2.5, { count: 60, speed: 5, up: 6, life: 1.4 });
        ctx.sound.play("gate");
      });
      after(6.4, () => {
        reviewBonus = state.merges === 0 && state.wrong === 0 ? 300 : 150;
        startDev(false);
      });
    });

    mergeButton.addEventListener("click", () => {
      if (state.done) {
        return;
      }
      state.merges += 1;
      ctx.setData("review", "merged");
      prView.box = "merged";
      drawPr();
      shake = 0.5;
      merged.hidden = false;
      actions.hidden = true;
      hud.chat("mariia", t("mariia_merged"), 4500);
      if (state.merges === 1) {
        missed.push(t("missedMerge"));
      }
      // The same mistake never costs twice, and never the last attempt
      if (ctx.attempts > 1) {
        ctx.loseAttempt(t("mergeTitle"), t("mergeTip"));
      } else {
        ctx.points(-100);
        hud.toast(t("mergeTitle"), "bad");
      }
      if (ctx.playing) {
        restoreButton.focus();
      }
    });

    restoreButton.addEventListener("click", () => {
      merged.hidden = true;
      mergeButton.disabled = true;
      mergeBox.classList.add("is-off");
      actions.hidden = false;
      prView.box = "ready";
      drawPr();
      ctx.setData("review", "pending");
      ctx.sound.play("power");
      (state.found ? requestButton : card.hidden ? rows[0] : card).focus();
    });

    setStep(1);
    // Step 1 is a look: after a moment the goal moves on to the drag
    after(4, () => {
      if (state.step === 1) {
        setStep(2);
      }
    });
    card.focus({ preventScroll: true });
    return { panel, state, ghost };
  }

  /** Arrows move the focus from button to button of the review; Enter presses it. */
  function moveFocus(step) {
    const list = Array.from(review.panel.querySelectorAll("button")).filter((b) => !b.disabled && b.offsetParent !== null);
    if (!list.length) {
      return;
    }
    const index = list.indexOf(document.activeElement);
    const next = index < 0 ? 0 : (index + step + list.length) % list.length;
    list[next].focus();
  }

  /* ---------- The Dev at the end: "80% by Friday, with i++" ---------- */

  // His face: one of the twenty-one, not the one of the last play
  const devFace = pickAdmins(4, random)[0];
  const devFaceUrl = adminFaceUrl(devFace);
  const dev = { state: "off", hp: DEV_HP, lane: 1, x: 0, z: DEV_Z - 8, time: 0, nextMove: 0, nextShot: 0, volley: 0, volleyLane: 1, stage: 0, flash: 0, type: 0, guard: 0, hits: 0, thrown: 0, stopped: 0, letIn: 0, endAt: 0, giveUpShown: false };
  let reviewBonus = 300;
  let autoplay = false;
  let autoTimer = 0;

  // The check plays the Dev by itself (window.__guineaRun only exists for checks)
  if (window.__guineaRun) {
    window.__guineaRun.w4 = {
      autoplay(on) {
        autoplay = on !== false;
      },
      // Straight to the Dev from the battle, as if the review were done (a try again then starts at him)
      toDev() {
        if (phase === "battle" && !boss.active) {
          startDev(false);
        }
      }
    };
  }

  const devBody = createDevFigure(ctx, { faceUrl: devFaceUrl, name: t("devName"), screen: "i++; i++;", onFace: () => ctx.setData("devface", String(devFace)) });
  const devBar = createDevBar(hud, devFaceUrl, t("devName"));
  const speech = createDevSpeech(hud, () => clock);

  function renderDevBar() {
    devBar.render(dev.hp / DEV_HP, "i++ \u2713" + dev.stopped + (dev.letIn ? "  \u2192" + dev.letIn : ""), dev.letIn > 0);
  }

  function setDevData() {
    ctx.setData("dev", dev.state);
    ctx.setData("devhp", dev.hp);
    ctx.setData("thrown", dev.thrown);
    ctx.setData("stopped", dev.stopped);
    ctx.setData("letin", dev.letIn);
  }

  /** A line of the Dev (core/dev.js keeps it its reading time); his give-up starts the end once it shows. */
  function devSay(key, reaction) {
    const end = (read) => {
      dev.giveUpShown = true;
      dev.endAt = clock + Math.max(DEV_BEATEN_S, read + 0.4);
    };
    speech.say(t(key), reaction, key === "devGiveUp" ? end : null);
  }

  /** The Dev comes, after the review (or straight away: guinea-at=6, or a try again after the attempts ran out at him). */
  function startDev(retry) {
    phase = "dev";
    wave = 6;
    queue = [];
    for (const o of liveObjects()) {
      kill(o, false);
    }
    if (review) {
      review.panel.hidden = true;
    }
    ctx.setData("wave", 6);
    ctx.setData("review", review ? "changes" : "skipped");
    hud.setPads(PADS);
    hud.setPath([t("p1"), t("p2"), t("p3"), t("p4"), t("p5"), t("p6")], 5);
    hud.goal(t("goal6"));
    meter.hidden = true;
    ctx.setData("messages", "bottom");
    source.material = sourceMaterial("AccountTierServiceTest.cls");
    prView.short = t("devPr");
    prView.sub = t("devInto");
    setChecks(["run", t("running")], ["ok", t("passing")], "blocked");
    Object.assign(dev, { state: "enter", hp: DEV_HP, lane: 1, x: 0, z: DEV_Z - 8, time: 0, nextMove: 3, nextShot: 0, volley: 0, stage: 0, flash: 0, hits: 0, thrown: 0, stopped: 0, letIn: 0, endAt: 0, giveUpShown: false });
    devBody.visible = true;
    devBar.hidden = false;
    renderDevBar();
    MUSIC = "4-dev";
    pace = 1;
    mercy = retry ? MERCY : 0;
    ctx.sound.play("bossIn");
    devSay("devArrive");
    hud.tick("@isTest static void coverage() { Integer i = 0; i++; i++; i++; i++; i++; i++; i++; }");
    // A player who lost a lot comes to him with an attempt back
    if (ctx.attempts < 3) {
      ctx.gainAttempt();
    }
    if (retry) {
      hud.toast(t("retryBoss"), "power");
    }
    setDevData();
  }

  function stepDev(dt) {
    dev.time += dt;
    dev.flash = Math.max(0, dev.flash - dt);
    dev.type = Math.max(0, dev.type - dt);
    dev.guard = Math.max(0, dev.guard - dt);
    speech.update();
    // A steady pace, eased for a while after a mistake
    mercy = Math.max(0, mercy - MERCY_FADE * dt);
    pace += (Math.max(0.85, DEV_PACE - mercy) - pace) * Math.min(1, dt * 0.8);
    ctx.setData("pace", pace.toFixed(2));
    if (dev.state === "enter") {
      dev.z += (DEV_Z - dev.z) * Math.min(1, dt * 1.6);
      // He talks first: nothing comes down the lanes before his line is read
      if (dev.time >= DEV_ENTER_S && !speech.reading) {
        dev.state = "fight";
        ctx.bossStarted();
        dev.nextShot = 0.4;
        setDevData();
      }
    } else if (dev.state === "fight") {
      dev.nextMove -= dt;
      if (dev.nextMove <= 0 && dev.volley === 0) {
        dev.lane = (dev.lane + 1 + Math.floor(random() * 2)) % 3;
        dev.nextMove = 2.8 + random() * 1.4 - dev.stage * 0.3;
      }
      dev.nextShot -= dt * pace;
      if (dev.nextShot <= 0) {
        devShoot();
      }
    } else if (dev.state === "beaten" && dev.giveUpShown && clock >= dev.endAt) {
      devGone();
    }
    dev.x += (LANES[dev.lane] - dev.x) * Math.min(1, dt * 4);
  }

  /** He types: a volley of i++ down one lane, or now and then a worse line. */
  function devShoot() {
    if (dev.volley > 0) {
      dev.volley -= 1;
      spawn("ipp", dev.volleyLane, { z: dev.z + 1.2 });
      dev.thrown += 1;
      dev.type = 0.3;
      ctx.sound.play("w4Type");
      dev.nextShot = dev.volley > 0 ? 0.6 : 1.5 - dev.stage * 0.15;
    } else if (random() < 0.16 + dev.stage * 0.06) {
      const worse = DEV_WORSE[dev.stage];
      spawn(worse[Math.floor(random() * worse.length)], pickLane(dev.lane), { z: dev.z + 1.2 });
      dev.thrown += 1;
      dev.type = 0.3;
      ctx.sound.play("bossThrow");
      dev.nextShot = 1.7;
    } else {
      // Three to five lines in a row, mostly down his own lane
      dev.volley = 3 + Math.floor(random() * 2) + (dev.stage > 0 ? 1 : 0);
      dev.volleyLane = random() < 0.7 ? dev.lane : pickLane(dev.lane);
      devShoot();
      return;
    }
    setDevData();
  }

  function hitDev() {
    dev.hp -= 1;
    dev.hits += 1;
    dev.flash = 0.18;
    shake = 0.15;
    burst(dev.x, 2.6, dev.z + 0.6, "padding", 6);
    ctx.sound.play("bossHit");
    renderDevBar();
    if (dev.hp <= 0) {
      ctx.bossBeaten();
      beatDev();
      return;
    }
    ctx.collect(40, "");
    // He hops aside at once, and types again soon
    dev.guard = DEV_GUARD_S;
    dev.lane = (dev.lane + 1 + Math.floor(random() * 2)) % 3;
    dev.nextMove = 2.8 + random() * 1.4 - dev.stage * 0.3;
    dev.nextShot = Math.min(dev.nextShot, 0.7);
    const stage = dev.hp <= 4 ? 2 : dev.hp <= 8 ? 1 : 0;
    if (stage > dev.stage) {
      dev.stage = stage;
      devSay(stage === 1 ? "devLine1" : "devLine2");
    } else if (dev.hits % 3 === 1) {
      devSay("devOuch", true);
    }
    setDevData();
  }

  function beatDev() {
    dev.state = "beaten";
    devRetryAt = 0;
    for (const o of liveObjects()) {
      kill(o, false);
    }
    queue = [];
    devSay("devGiveUp");
    MUSIC = 4;
    ctx.sound.play("bossDown");
    shake = 0.5;
    ctx.fx.burst(dev.x, 2.6, dev.z + 0.6, { count: 70, colors: [0xdd7a01, 0xffd84d, 0x2e844a, 0x0176d3, 0xffffff], speed: 6, up: 6, life: 1.4 });
    ctx.collect(500, t("devDown"));
    hud.goal("");
    hud.toast(t("devLesson"), "good");
    devBar.hidden = true;
    setChecks(["fail", "i++"], ["ok", t("passing")], "blocked");
    setDevData();
  }

  /** He is gone with his laptop: the Cloudity mark rises, and the world ends. */
  function devGone() {
    dev.state = "gone";
    phase = "end";
    devBody.visible = false;
    speech.hide();
    if (cloudity) {
      cloudity.visible = true;
      cloudRise = 0.001;
    }
    ctx.fx.burst(0, 2, -2.5, { count: 60, speed: 5, up: 6, life: 1.4 });
    ctx.sound.play("gate");
    if (dev.letIn) {
      missed.push(t("missedPadding", { n: dev.letIn }));
    }
    setDevData();
    after(1.8, () => ctx.finish(reviewBonus + (dev.letIn === 0 ? 150 : 0), missed.join(" ")));
  }

  /** Where he stands and how he moves: walking in, typing, shaken by a hit, ashamed, leaving. */
  function placeDev(time) {
    if (!devBody.visible) {
      return;
    }
    let scale = DEV_SCALE;
    let lean = 0;
    if (dev.state === "beaten") {
      lean = 0.3;
      const left = dev.giveUpShown ? dev.endAt - clock : DEV_LEAVE_S;
      if (left < DEV_LEAVE_S) {
        scale *= Math.max(0.05, left / DEV_LEAVE_S);
      }
    }
    const walking = (dev.state === "enter" && Math.abs(DEV_Z - dev.z) > 0.3) || Math.abs(LANES[dev.lane] - dev.x) > 0.15;
    const stride = walking ? Math.sin(time * 10) : 0;
    // The hop of his dodge
    const hop = dev.guard > 0 ? Math.sin((dev.guard / DEV_GUARD_S) * Math.PI) * 0.6 : 0;
    const bob = hop + (walking ? Math.abs(stride) * 0.08 : Math.sin(time * 2.6) * 0.03);
    // Both hands on the keyboard, faster when he types a line
    const typing = dev.type > 0 ? Math.sin(time * 30) * 0.18 : Math.sin(time * 6) * 0.04;
    devBody.place({ x: dev.x, y: bob, z: dev.z, scale: scale * (1 + dev.flash * 0.4), lean, stride, typing });
  }

  function placeSay() {
    speech.place(camera, devBody.face.position, DEV_HEAD_R * devBody.face.scale.x);
  }

  /** For the check: the world plays its battle and the Dev by itself (window.__guineaRun.w4.autoplay). */
  function autoStep(dt) {
    autoTimer -= dt;
    if (autoTimer > 0 || (phase !== "battle" && phase !== "dev")) {
      return;
    }
    autoTimer = 0.1;
    const live = liveObjects().filter((o) => o.z > SPAWN_Z + 4);
    const nearest = (list) => list.sort((a, b) => b.z - a.z)[0];
    // What costs an attempt first, then what costs points, then a test to catch
    const threat = nearest(live.filter((o) => o.def.tone === "error")) || nearest(live.filter((o) => o.def.tone === "padding" || o.def.tone === "fake"));
    const test = nearest(live.filter((o) => o.def.tone === "test"));
    let lane = player.lane;
    if (threat) {
      lane = threat.lane;
    } else if (test) {
      lane = test.lane;
    } else if (phase === "dev" && dev.state === "fight") {
      lane = dev.lane;
    } else if (boss.active && !boss.dying) {
      lane = boss.lane;
    }
    if (lane !== player.lane) {
      player.lane += lane < player.lane ? -1 : 1;
      return;
    }
    const first = nearest(live.filter((o) => o.lane === lane));
    if (first ? !["warning", "test"].includes(first.def.tone) : (phase === "dev" && dev.state === "fight") || boss.active) {
      throwFix();
    }
  }

  /* ---------- Camera ---------- */

  function placeCamera(time, dt) {
    const portrait = engine.portrait;
    const jitter = shake > 0 && engine.motion ? (Math.random() - 0.5) * shake : 0;
    shake = Math.max(0, shake - (dt || 0));
    const sway = Math.sin(time * 0.4) * 0.3;
    if (portrait) {
      camera.fov = 70 + (pace - 1) * 10;
      camera.position.set(sway * 0.5 + jitter, 10.5, 11.2);
      camera.lookAt(0, -0.4, -7.5);
    } else {
      camera.fov = 52 + (pace - 1) * 10;
      camera.position.set(sway + player.x * 0.15 + jitter, 7.8, 11.6);
      camera.lookAt(player.x * 0.1, 0, -3);
    }
    camera.updateProjectionMatrix();
    engine.aimSun(0, -4);
  }

  function placePig(dt) {
    const target = LANES[player.lane];
    const dx = target - player.x;
    player.x += Math.sign(dx) * Math.min(Math.abs(dx), 13 * dt);
    player.hop = Math.max(0, player.hop - dt);
    const height = player.hop > 0 ? Math.sin((player.hop / 0.22) * Math.PI) * 0.25 : 0;
    pig.object.position.set(player.x, height, PIG_Z);
    // A bit bigger and turned three quarters, so the star is not only a back
    pig.object.scale.setScalar(1.35);
    pig.object.rotation.set(0, 0.35 - player.x * 0.06, 0);
    pig.shadow.position.set(player.x, 0.012, PIG_Z + 0.05);
    pig.state = { running: Math.abs(dx) > 0.05, airborne: height > 0.01, ducking: player.stun > 0, speed: 4, height };
    markers.forEach((marker, i) => {
      marker.material = i === player.lane ? markerOn : markerOff;
    });
  }

  placePig(0);
  placeCamera(0, 0);

  return {
    start() {
      // guinea-at=6 (a check setting) opens the Dev; so does the try again of a player out of attempts at him
      const at = ctx.params.startAt;
      const retry = !at && devRetryAt > 0 && Date.now() - devRetryAt < DEV_RETRY_MS;
      devRetryAt = 0;
      if (at >= 6 || retry) {
        coverage = COVERAGE_TARGET + 0.52;
        shownCoverage = coverage;
        renderMeter();
        prView.box = "merged";
        startDev(retry);
        return;
      }
      // guinea-at=5 (a check setting, like a runner's metres) opens the review directly
      if (at === 5) {
        coverage = COVERAGE_TARGET + 0.52;
        shownCoverage = coverage;
        renderMeter();
        startWave(5);
        return;
      }
      startWave(1);
    },
    update(dt, time) {
      clock += dt;
      const due = later.filter((l) => l.at <= clock);
      later = later.filter((l) => l.at > clock);
      for (const l of due) {
        l.run();
        if (!ctx.playing) {
          return;
        }
      }
      player.cooldown = Math.max(0, player.cooldown - dt);
      player.stun = Math.max(0, player.stun - dt);
      if (autoplay) {
        autoStep(dt);
      }
      if (phase === "dev") {
        stepDev(dt);
        if (!ctx.playing) {
          return;
        }
      }
      if (phase === "battle") {
        updatePace(dt);
        updateWave(dt);
        updateBoss(dt);
        if (!ctx.playing) {
          return;
        }
      }
      updateThrows(dt);
      updateObjects(dt);
      if (!ctx.playing) {
        return;
      }
      // The meter slides to its value rather than jumping
      if (Math.abs(shownCoverage - coverage) > 0.005) {
        shownCoverage += (coverage - shownCoverage) * Math.min(1, dt * 3);
        if (Math.abs(shownCoverage - coverage) < 0.01) {
          shownCoverage = coverage;
        }
        renderMeter();
      }
      if (bannerTime > 0) {
        bannerTime -= dt;
        if (bannerTime <= 0) {
          banner.classList.remove("is-shown");
        }
      }
      if (cloudity && cloudRise > 0 && cloudRise < 1) {
        // The Cloudity mark pops up with a little overshoot
        cloudRise = Math.min(1, cloudRise + dt * 1.6);
        const k = cloudRise;
        cloudity.scale.setScalar(cloudityScale * (k < 0.7 ? k / 0.7 * 1.15 : 1.15 - ((k - 0.7) / 0.3) * 0.15));
      }
      if (cloudity && cloudRise >= 1) {
        cloudity.rotation.y = Math.sin(time * 1.5) * 0.3;
      }
      placePig(dt);
      placeCamera(time, dt);
      placeDev(time);
      placeSay();
      ctx.setData("lane", player.lane);
      if (boss.active) {
        ctx.setData("boss", boss.hp);
      }
    },
    action(name) {
      if (phase === "review") {
        if (!review) {
          return;
        }
        if (name === "left" || name === "jump") {
          moveFocus(-1);
        } else if (name === "right" || name === "duck") {
          moveFocus(1);
        } else if (name === "confirm") {
          const focused = document.activeElement;
          if (focused && review.panel.contains(focused) && focused.tagName === "BUTTON") {
            focused.click();
          } else {
            moveFocus(1);
          }
        }
        return;
      }
      if (name === "left") {
        player.lane = Math.max(0, player.lane - 1);
      } else if (name === "right") {
        player.lane = Math.min(2, player.lane + 1);
      } else if ((phase === "battle" || phase === "dev") && (name === "jump" || name === "tap" || name === "confirm")) {
        throwFix();
      }
    },
    idleCamera(time) {
      placeCamera(time, 0);
    },
    dispose() {
      for (const o of objects) {
        root.remove(o.mesh);
      }
      objects = [];
      prTexture.dispose();
      prMaterial.dispose();
      bossTexture.dispose();
      bossFace.dispose();
      meter.remove();
      banner.remove();
      devBar.remove();
      speech.remove();
      devBody.dispose();
      if (window.__guineaRun && window.__guineaRun.w4) {
        delete window.__guineaRun.w4;
      }
      if (review) {
        review.panel.remove();
        review.ghost.remove();
      }
      hud.setPath([], 0);
      pig.object.scale.setScalar(1);
    }
  };
}

export const CSS =
  DEV_CSS +
  `
.guinea-run .gr-w4-meter {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  border: 1px solid #c9c9c9;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.95);
  font-size: 12px;
  pointer-events: none;
}
.guinea-run .gr-w4-meter[hidden] {
  display: none;
}
.guinea-run .gr-w4-meter strong {
  color: #032d60;
}
.guinea-run .gr-w4-bar {
  position: relative;
  width: 190px;
  height: 12px;
  margin: 12px 0 2px;
  border-radius: 6px;
  background: #e5e5e5;
}
.guinea-run .gr-w4-bar i {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 6px;
  background: #2e844a;
}
.guinea-run .gr-w4-meter[data-state="under"] .gr-w4-bar i {
  background: #fe9339;
}
.guinea-run .gr-w4-meter[data-state="low"] .gr-w4-bar i {
  background: #ea001e;
}
.guinea-run .gr-w4-mark {
  position: absolute;
  top: -3px;
  bottom: -3px;
  width: 2px;
  background: #032d60;
}
.guinea-run .gr-w4-mark--floor {
  background: #ba0517;
}
.guinea-run .gr-w4-mark em {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  color: #032d60;
  font-size: 12px;
  font-style: normal;
  font-weight: 700;
  line-height: 1;
}
.guinea-run .gr-w4-mark--floor em {
  color: #ba0517;
}
.guinea-run .gr-w4-value {
  min-width: 52px;
  color: #032d60;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.guinea-run .gr-w4-banner {
  position: absolute;
  top: 34%;
  left: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  max-width: calc(100vw - 32px);
  padding: 12px 22px;
  border-radius: 6px;
  background: rgba(3, 45, 96, 0.92);
  color: #ffffff;
  text-align: center;
  opacity: 0;
  transform: translate(-50%, 10px);
  transition: opacity 0.3s, transform 0.3s;
  pointer-events: none !important;
}
.guinea-run .gr-w4-banner.is-shown {
  opacity: 1;
  transform: translate(-50%, 0);
}
.guinea-run .gr-w4-banner strong {
  font-size: 22px;
}
.guinea-run .gr-w4-banner span {
  font-size: 15px;
}
.guinea-run .gr-w4-review {
  position: absolute;
  top: calc(env(safe-area-inset-top, 0px) + 132px);
  left: 50%;
  bottom: 40px;
  width: min(780px, calc(100vw - 24px));
  transform: translateX(-50%);
  overflow-y: auto;
  padding: 12px 14px;
  border: 1px solid #c9c9c9;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  color: #181818;
  font-size: 14px;
}
.guinea-run .gr-w4-review[hidden] {
  display: none;
}
.guinea-run .gr-w4-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}
.guinea-run .gr-w4-head div {
  display: flex;
  flex-direction: column;
}
.guinea-run .gr-w4-head strong {
  font-size: 16px;
}
.guinea-run .gr-w4-head span {
  color: #444444;
  font-size: 13px;
}
.guinea-run .gr-w4-prtile {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 6px;
  background: #2e844a;
  color: #ffffff !important;
  font-weight: 800;
}
.guinea-run .gr-w4-checks {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0 0 0 auto;
}
.guinea-run .gr-w4-check {
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}
.guinea-run .gr-w4-check.is-ok {
  background: #2e844a;
  color: #ffffff;
}
.guinea-run .gr-w4-check.is-ok::before {
  content: "\\2713  ";
}
.guinea-run .gr-w4-check.is-run {
  background: #e5e5e5;
  color: #444444;
}
.guinea-run .gr-w4-steps {
  display: flex;
  gap: 6px;
  margin: 8px 0 6px;
  padding: 0;
  list-style: none;
  counter-reset: w4step;
}
.guinea-run .gr-w4-steps li {
  flex: 1 1 0;
  padding: 6px 8px;
  border-radius: 6px;
  background: #f3f3f3;
  color: #706e6b;
  font-size: 13px;
  font-weight: 700;
  counter-increment: w4step;
}
.guinea-run .gr-w4-steps li::before {
  content: counter(w4step) ". ";
}
.guinea-run .gr-w4-steps li[data-state="now"] {
  background: #0176d3;
  color: #ffffff;
}
.guinea-run .gr-w4-steps li[data-state="done"] {
  background: #2e844a;
  color: #ffffff;
}
.guinea-run .gr-w4-steps li[data-state="done"]::before {
  content: "\\2713  ";
}
.guinea-run .gr-w4-lab {
  margin: 0 0 6px;
  padding: 6px 10px;
  border-left: 4px solid #fe9339;
  border-radius: 4px;
  background: #fff4e5;
  color: #3e2b00;
  font-size: 13px;
}
.guinea-run .gr-w4-desc {
  margin: 0 0 8px;
  color: #444444;
  font-size: 13px;
}
.guinea-run .gr-w4-dockrow {
  position: sticky;
  top: -12px;
  z-index: 2;
  padding: 4px 0;
  background: #ffffff;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 0 0 6px;
}
.guinea-run .gr-w4-dock {
  display: flex;
  justify-content: center;
}
.guinea-run .gr-w4-card,
.guinea-run .gr-w4-ghost {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-height: 52px;
  padding: 8px 16px 8px 44px;
  border: 2px solid #0176d3;
  border-radius: 10px;
  background: #eef4ff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%230176d3' d='M4 3h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z'/%3E%3C/svg%3E") no-repeat 12px center / 22px;
  color: #032d60;
  font: inherit;
  text-align: left;
  cursor: grab;
  touch-action: none;
  user-select: none;
  box-shadow: 0 2px 0 #014486;
}
.guinea-run .gr-w4-card strong {
  font-size: 15px;
}
.guinea-run .gr-w4-card span {
  font-size: 12px;
}
.guinea-run .gr-w4-card:focus-visible {
  outline: 3px solid #fe9339;
}
.guinea-run .gr-w4-card.is-lifted {
  opacity: 0.4;
}
.guinea-run .gr-w4-card[hidden] {
  display: none;
}
.guinea-run .gr-w4-ghost {
  position: fixed;
  z-index: 5;
  min-height: 0;
  padding: 8px 14px 8px 40px;
  font-weight: 800;
  transform: translate(-50%, -120%) rotate(-3deg);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.3);
  pointer-events: none !important;
}
.guinea-run .gr-w4-task {
  margin: 0;
  color: #032d60;
  font-weight: 800;
}
.guinea-run .gr-w4-diff {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.guinea-run .gr-w4-side {
  padding: 6px;
  border: 1px solid #c9c9c9;
  border-radius: 6px;
}
.guinea-run .gr-w4-before {
  background: #fef1ee;
}
.guinea-run .gr-w4-after {
  background: #ebf7e6;
}
.guinea-run .gr-w4-ltitle {
  display: block;
  margin-bottom: 4px;
  color: #032d60;
  font-size: 13px;
  font-weight: 800;
  text-transform: uppercase;
}
.guinea-run .gr-w4-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
}
.guinea-run .gr-w4-col {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.guinea-run .gr-w4-field {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  min-height: 26px;
  padding: 1px 8px;
  border: 1px solid #dddbda;
  border-radius: 4px;
  background: #ffffff;
  color: #181818;
  font: inherit;
  font-size: 13px;
  text-align: left;
}
.guinea-run button.gr-w4-drop {
  cursor: pointer;
  border-style: dashed;
  border-color: #8ab8e6;
}
.guinea-run button.gr-w4-drop:hover,
.guinea-run button.gr-w4-drop:focus-visible,
.guinea-run .gr-w4-drop.is-over {
  border: 2px solid #0176d3;
  outline: none;
  background: #d8ecff;
}
.guinea-run .gr-w4-arrow {
  padding: 0 6px;
  border-radius: 999px;
  background: #0176d3;
  color: #ffffff;
  font-size: 11px;
  font-style: normal;
  font-weight: 700;
}
.guinea-run .gr-w4-arrow::before {
  content: "\\2192  ";
}
.guinea-run .gr-w4-missing {
  padding: 0 6px;
  border-radius: 999px;
  background: #ea001e;
  color: #ffffff;
  font-size: 11px;
  font-style: normal;
  font-weight: 700;
}
.guinea-run .gr-w4-field.is-wrong {
  border-color: #fe9339;
  background: #fff4e5;
  cursor: default;
}
.guinea-run .gr-w4-field.is-shake {
  animation: gr-w4-shake 0.45s;
}
@keyframes gr-w4-shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-6px); }
  40%, 80% { transform: translateX(6px); }
}
.guinea-run .gr-w4-field.is-hint {
  outline: 2px dashed #ea001e;
}
.guinea-run .gr-w4-field:disabled {
  cursor: default;
}
.guinea-run .gr-w4-field.is-found {
  border: 2px solid #ea001e;
  background: #fef1ee;
}
.guinea-run .gr-w4-field.is-found > span {
  text-decoration: line-through;
}
.guinea-run .gr-w4-field.is-moved {
  border-color: #0176d3;
  background: #eef4ff;
}
.guinea-run .gr-w4-field.is-back {
  border-color: #2e844a;
  background: #ffffff;
}
.guinea-run .gr-w4-c2 {
  display: block;
  color: #706e6b;
  font-size: 12px;
  font-weight: 700;
}
.guinea-run .gr-w4-empty {
  display: block;
  padding: 6px;
  border: 1px dashed #c9c9c9;
  border-radius: 3px;
  color: #706e6b;
  font-size: 12px;
  text-align: center;
}
.guinea-run .gr-w4-comment strong {
  display: block;
  margin-bottom: 2px;
  color: #ba0517;
  font-family: 'Open Sans', Arial, sans-serif;
}
.guinea-run .gr-w4-comment {
  margin: 10px 0 4px;
  padding: 6px 10px;
  border-left: 4px solid #0176d3;
  border-radius: 4px;
  background: #ffffff;
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 12px;
}
.guinea-run .gr-w4-actions {
  position: sticky;
  bottom: -12px;
  z-index: 1;
  padding: 8px 0 10px;
  border-top: 1px solid #e5e5e5;
  background: #ffffff;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 10px;
}
.guinea-run .gr-w4-actions .gr-w4-comment {
  flex: 1 1 100%;
  margin: 0;
}
.guinea-run .gr-w4-actions.is-found {
  flex-wrap: wrap;
}
.guinea-run .gr-w4-actions[hidden] {
  display: none;
}
.guinea-run .gr-w4-hint {
  flex: 1 1 200px;
  align-self: center;
  margin: 0;
  color: #706e6b;
  font-size: 13px;
}
.guinea-run .gr-w4-request {
  min-height: 48px;
  font-size: 16px;
}
.guinea-run .gr-w4-request:not(:disabled) {
  border-color: #0176d3;
  background: #0176d3;
  color: #ffffff;
  box-shadow: 0 0 0 4px rgba(1, 118, 211, 0.25);
}
.guinea-run .gr-w4-request:disabled {
  opacity: 0.5;
  cursor: default;
}
.guinea-run .gr-w4-mergebox {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  max-width: 230px;
}
.guinea-run .gr-button.gr-w4-merge {
  min-height: 48px;
  padding: 8px 22px;
  border-color: #2e844a;
  background: #2e844a;
  color: #ffffff;
  font-size: 16px;
}
.guinea-run .gr-button.gr-w4-merge:hover {
  background: #22683a;
}
.guinea-run .gr-w4-merge:disabled {
  opacity: 0.4;
}
.guinea-run .gr-w4-trap {
  color: #ba0517;
  font-size: 12px;
  font-weight: 700;
  text-align: center;
}
.guinea-run .gr-w4-merged {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 4px;
  background: #f4ebff;
  color: #3b0e6b;
}
.guinea-run .gr-w4-merged[hidden] {
  display: none;
}
.guinea-run .gr-w4-merged .gr-button {
  align-self: flex-start;
  min-height: 44px;
}
@media (max-width: 600px) {
  .guinea-run .gr-w4-bar {
    width: 120px;
  }
  .guinea-run .gr-w4-review {
    top: calc(env(safe-area-inset-top, 0px) + 136px);
    bottom: 140px;
    padding: 8px;
    font-size: 13px;
  }
  .guinea-run .gr-w4-prtile,
  .guinea-run .gr-w4-head div span {
    display: none;
  }
  .guinea-run .gr-w4-head {
    gap: 4px;
  }
  .guinea-run .gr-w4-head strong {
    font-size: 14px;
  }
  .guinea-run .gr-w4-checks {
    margin: 0;
  }
  .guinea-run .gr-w4-check {
    font-size: 11px;
  }
  .guinea-run .gr-w4-steps {
    margin: 6px 0 4px;
  }
  .guinea-run .gr-w4-lab,
  .guinea-run .gr-w4-desc {
    margin-bottom: 4px;
    font-size: 12px;
  }
  .guinea-run .gr-w4-dockrow {
    top: -8px;
  }
  .guinea-run .gr-w4-task {
    font-size: 12px;
  }
  .guinea-run .gr-w4-card {
    width: 100%;
    min-height: 48px;
  }
  .guinea-run .gr-w4-actions {
    bottom: -8px;
    padding: 6px 0 8px;
    gap: 6px;
  }
  .guinea-run .gr-w4-trap {
    font-size: 11px;
  }
  .guinea-run .gr-w4-steps li {
    padding: 3px 5px;
    font-size: 11px;
  }
  .guinea-run .gr-w4-diff {
    gap: 6px;
  }
  .guinea-run .gr-w4-cols {
    grid-template-columns: 1fr;
  }
  .guinea-run .gr-w4-field {
    min-height: 44px;
    padding: 3px 6px;
  }
  .guinea-run .gr-w4-empty {
    padding: 2px;
  }
  .guinea-run .gr-w4-actions {
    flex-wrap: nowrap;
  }
  .guinea-run .gr-w4-actions.is-found {
    flex-wrap: wrap;
  }
  .guinea-run .gr-w4-actions .gr-w4-comment {
    max-height: 30vh;
    overflow-y: auto;
  }
  .guinea-run .gr-w4-hint {
    display: none;
  }
  .guinea-run .gr-w4-request,
  .guinea-run .gr-w4-mergebox {
    flex: 1 1 0;
  }
  .guinea-run .gr-w4-request,
  .guinea-run .gr-button.gr-w4-merge {
    width: 100%;
    padding: 6px 8px;
    font-size: 15px;
  }
}
`;
