// The lore page.
//
// pizzint's history page sells the KGB "PIZZINT" doctrine, Frank Meeks' 101
// pizzas to the Pentagon, Wolf Blitzer's line about monitoring the pizzas. It
// is the single reason the gimmick reads as a tradition rather than as a joke,
// and it is pure SEO surface (TEARDOWN 2.2).
//
// AI has the same job to do and strictly better material, because all of ours
// is real. Every entry below is a dated, checkable event carrying at least one
// primary or near-primary link. The house rules for this file:
//
//   1. A claim with no date and no link does not go on the page. sourceLinks()
//      throws rather than render an entry that lost its citation in an edit.
//   2. Describe and cite; do not reproduce. At most a handful of words in
//      quotation marks, attributed on the spot.
//   3. Nothing here is a forecast, including in the chapter titles. That people
//      worried about this, on these dates, is a fact. Whether they were right
//      is not something this file gets to assert.
//   4. Deterministic: the only inputs are the frozen arrays in this module plus
//      ctx.state.generated_at. Two builds from one data/ produce identical HTML.

import { esc } from './_html.mjs';
import { page } from './layout.mjs';
import * as brand from '../brand.mjs';

// ---------------------------------------------------------------------------
// Chapters
// ---------------------------------------------------------------------------

// DECISION: chapters are THREADS, not periods, and they overlap on purpose. A
// strict chronology buries the actual shape of the record — that the capability
// curve and the governance curve are different curves running at different
// speeds — under an undifferentiated list of years. The overlap is stated in
// the page's own lede rather than hidden, because a reader who notices it
// unaided concludes the page is sloppy.
const CHAPTERS = [
  {
    id: 'idea',
    numeral: 'I',
    title: 'The idea arrives before the machines do',
    standfirst:
      'Every argument being had in 2026 was written down before anyone had the hardware to test ' +
      'it. Two of these three documents are funding proposals.',
  },
  {
    id: 'precedent',
    numeral: 'II',
    title: 'The precedent nobody in AI can stop citing',
    standfirst:
      'In 1974 a field called a halt on itself, and in 1975 it met in a conference centre on the ' +
      'California coast to write the rules. Every AI governance proposal since has been measured ' +
      'against it, usually by people invoking the name and skipping the details.',
  },
  {
    id: 'shape',
    numeral: 'III',
    title: 'The argument acquires a shape',
    standfirst:
      'Between the second AI winter and the deep learning era, the worry got precise enough to be ' +
      'criticised — which is the point at which an intuition becomes a position.',
  },
  {
    id: 'jumps',
    numeral: 'IV',
    title: 'The capability jumps',
    standfirst:
      'Five dates on which something that could not be done became something that had been done. ' +
      'Note how ordinary the delivery mechanism is: a chess match, a contest entry, a preprint.',
  },
  {
    id: 'signatures',
    numeral: 'V',
    title: 'The field signs its name',
    standfirst:
      'The distinguishing feature of this round of AI worry is that the people building the ' +
      'systems are the ones signing the letters. That is a dated, countable event, whatever you ' +
      'make of the content.',
  },
  {
    id: 'dates',
    numeral: 'VI',
    title: 'Governance acquires dates',
    standfirst:
      'The stretch where the governance pillar of this index became countable. Declarations are ' +
      'cheap and statutes are not, and both leave machine-readable records with numbers on them.',
  },
];

// ---------------------------------------------------------------------------
// The record
// ---------------------------------------------------------------------------

// `date` is machine-readable, for <time datetime> and for the decade strip.
// `display` is what a human reads. They are separate fields because "1–2
// November 2023" and "1965" are both correct displays and neither is a valid
// datetime value.
const TIMELINE = [
  // -- I. The idea arrives before the machines do ---------------------------
  {
    chapter: 'idea',
    date: '1950-10',
    display: 'October 1950',
    title: 'Turing proposes a test instead of a definition',
    body:
      'Alan Turing opens "Computing Machinery and Intelligence" by rejecting the question "can ' +
      'machines think?" as too ill-defined to answer, and substitutes an operational test that can ' +
      'actually be run. The move that starts the field is a refusal to argue about definitions and ' +
      'an insistence on something observable. This index is built on the same refusal, ' +
      'three-quarters of a century later.',
    sources: [
      { label: 'Turing, A. M. (1950). Mind, LIX(236), 433–460', href: 'https://doi.org/10.1093/mind/LIX.236.433' },
    ],
  },
  {
    chapter: 'idea',
    date: '1955-08-31',
    display: '31 August 1955',
    title: 'The name is coined, in a funding proposal',
    body:
      'John McCarthy, Marvin Minsky, Nathaniel Rochester and Claude Shannon submit a proposal to ' +
      'the Rockefeller Foundation for a two-month, ten-man study at Dartmouth College the following ' +
      'summer. The phrase "artificial intelligence" is invented in that document, largely to ' +
      'sidestep the baggage of "cybernetics". The workshop ran through the summer of 1956. The two ' +
      'months did not suffice.',
    sources: [
      { label: 'McCarthy, Minsky, Rochester & Shannon (1955); reprinted in AI Magazine 27(4), 2006', href: 'https://doi.org/10.1609/aimag.v27i4.1904' },
    ],
  },
  {
    chapter: 'idea',
    date: '1965',
    display: '1965',
    title: 'Good describes the intelligence explosion',
    body:
      'I. J. Good, who had worked with Turing at Bletchley Park, sets out the recursive argument in ' +
      '"Speculations Concerning the First Ultraintelligent Machine": a machine that designs machines ' +
      'better than people do would design a better machine than itself, and the process would not ' +
      'obviously stop. Good called such a machine "the last invention that man need ever make". The ' +
      'phrase "intelligence explosion" enters the literature here, sixty years before anyone had to ' +
      'price it.',
    sources: [
      { label: 'Good, I. J. (1965). Advances in Computers, 6, 31–88', href: 'https://doi.org/10.1016/S0065-2458(08)60418-0' },
    ],
  },

  // -- II. The precedent ----------------------------------------------------
  {
    chapter: 'precedent',
    date: '1974-07-26',
    display: '26 July 1974',
    title: 'A field calls a moratorium on itself',
    body:
      'Paul Berg and ten co-signatories — among them David Baltimore, Stanley Cohen, Herbert Boyer ' +
      'and James Watson — publish a letter in Science asking laboratories worldwide to defer two ' +
      'named classes of recombinant DNA experiment until the hazards had been assessed. It is the ' +
      'one occasion on record where a research community paused a live line of its own work and the ' +
      'request was substantially honoured. Everyone arguing about AI training pauses is arguing ' +
      'about this letter, whether or not they cite it.',
    sources: [
      { label: 'Berg, P. et al. (1974). Science 185(4148), 303', href: 'https://doi.org/10.1126/science.185.4148.303' },
    ],
  },
  {
    chapter: 'precedent',
    date: '1975-02-24',
    display: '24–27 February 1975',
    title: 'Asilomar writes the rules',
    body:
      'About 140 people — molecular biologists, plus lawyers, physicians and the press — meet at the ' +
      'Asilomar Conference Grounds in Pacific Grove, California, and agree a tiered containment ' +
      'scheme matching physical and biological safeguards to assessed risk. The summary statement ' +
      'was published in PNAS that June; the NIH guidelines followed in 1976. The details that get ' +
      'dropped whenever the name is invoked: attendance was small, and it worked because the risk ' +
      'could be described in terms of specific named experiments rather than in terms of a general ' +
      'capability.',
    sources: [
      { label: 'Berg, Baltimore, Brenner, Roblin & Singer (1975). PNAS 72(6), 1981–1984', href: 'https://doi.org/10.1073/pnas.72.6.1981' },
    ],
  },

  // -- III. The argument acquires a shape -----------------------------------
  {
    chapter: 'shape',
    date: '1993',
    display: '1993',
    title: 'Vinge names the singularity and dates it',
    body:
      'Vernor Vinge presents "The Coming Technological Singularity" at the VISION-21 symposium held ' +
      'at NASA Lewis Research Center. He takes Good\'s recursive argument, gives it the name that ' +
      'stuck, and — unusually for the genre — commits to a dated window. This index notices that ' +
      'detail: a dated claim can be scored afterwards, and a vibe cannot.',
    sources: [
      { label: 'Vinge, V. (1993). VISION-21 Symposium, NASA Lewis Research Center (NASA CP-10129)', href: 'https://ntrs.nasa.gov/citations/19940022856' },
    ],
  },
  {
    chapter: 'shape',
    date: '2003',
    display: '2003',
    title: 'Bostrom builds the paperclip maximizer',
    body:
      'In "Ethical Issues in Advanced Artificial Intelligence", Nick Bostrom introduces the thought ' +
      'experiment that has outlived every other piece of vocabulary in this field: a ' +
      'superintelligence whose top goal is the manufacture of paperclips, which therefore converts ' +
      'first the Earth and then whatever else it can reach into paperclip production. The point is ' +
      'routinely mangled in retelling — see the note below the timeline — and it was expanded at ' +
      'book length in Superintelligence (Oxford University Press, 2014).',
    sources: [
      { label: 'Bostrom, N. (2003). In Smit, I. et al. (eds), Cognitive, Emotive and Ethical Aspects of Decision Making, Vol. 2', href: 'https://nickbostrom.com/ethics/ai' },
    ],
  },

  // -- IV. The capability jumps ---------------------------------------------
  {
    chapter: 'jumps',
    date: '1997-05-11',
    display: '11 May 1997',
    title: 'Deep Blue takes the rematch',
    body:
      'IBM\'s Deep Blue beats Garry Kasparov 3½–2½ in New York, winning the deciding game in nineteen ' +
      'moves. Chess had been the standing proxy for machine intelligence since the 1950s. It stopped ' +
      'being one the moment it fell, which is the pattern every benchmark on this list follows.',
    sources: [
      { label: 'IBM corporate history, Deep Blue', href: 'https://www.ibm.com/history/deep-blue' },
    ],
  },
  {
    chapter: 'jumps',
    date: '2012-09',
    display: 'September 2012',
    title: 'AlexNet ends the argument about deep learning',
    body:
      'Alex Krizhevsky, Ilya Sutskever and Geoffrey Hinton enter a deep convolutional network ' +
      'trained on two consumer GPUs into the ImageNet challenge and record a 15.3% top-5 error rate ' +
      'against 26.2% for the next best entry. The gap was too large to argue with, and the field ' +
      'reorganised around it inside about eighteen months. It is also the first entry on this page ' +
      'where the compute pillar would have moved.',
    sources: [
      { label: 'Krizhevsky, Sutskever & Hinton (2012). NeurIPS 25', href: 'https://papers.nips.cc/paper_files/paper/2012/hash/c399862d3b9d6b76c8436e924a68c45b-Abstract.html' },
    ],
  },
  {
    chapter: 'jumps',
    date: '2016-03-15',
    display: '15 March 2016',
    title: 'AlphaGo beats Lee Sedol 4–1',
    body:
      'Go had been the standing counter-example: too large a search space, too dependent on ' +
      'intuition. DeepMind\'s AlphaGo took the five-game match in Seoul. Lee Sedol won game four, and ' +
      'that game remains the last one a top human won against the system.',
    sources: [
      { label: 'Google DeepMind, AlphaGo', href: 'https://deepmind.google/research/breakthroughs/alphago/' },
    ],
  },
  {
    chapter: 'jumps',
    date: '2017-06-12',
    display: '12 June 2017',
    title: 'The transformer paper is posted',
    body:
      'Eight authors at Google publish an architecture that drops recurrence and convolution ' +
      'entirely in favour of attention. Almost every system this index counts today is a descendant ' +
      'of that paper. It is the clearest case in the record of a step change arriving as an ordinary ' +
      'preprint on an ordinary Monday — which is exactly why the capability pillar reads preprint ' +
      'feeds rather than press releases.',
    sources: [
      { label: 'Vaswani et al. (2017). arXiv:1706.03762', href: 'https://arxiv.org/abs/1706.03762' },
    ],
  },
  {
    chapter: 'jumps',
    date: '2022-11-30',
    display: '30 November 2022',
    title: 'ChatGPT ships as a research preview',
    body:
      'The underlying model was not new and the interface was a text box. What changed was who had ' +
      'access. This is the date the general public acquired an opinion about AI, and the date the ' +
      'attention pillar of this index stopped being quiet.',
    sources: [
      { label: 'OpenAI, Introducing ChatGPT', href: 'https://openai.com/index/chatgpt/' },
    ],
  },

  // -- V. The field signs its name ------------------------------------------
  {
    chapter: 'signatures',
    date: '2015-01-12',
    display: '12 January 2015',
    title: 'The research-priorities letter, and the money behind it',
    body:
      'The Future of Life Institute circulates "Research Priorities for Robust and Beneficial ' +
      'Artificial Intelligence" to attendees of its Puerto Rico conference (2–5 January 2015) and ' +
      'publishes it on 12 January. Stephen Hawking, Elon Musk and Steve Wozniak sign alongside ' +
      'several hundred working researchers, and Musk announced a $10 million donation to fund the ' +
      'resulting grant programme. The companion twelve-page research agenda ran in AI Magazine. This ' +
      'is the entry that turns AI safety from a preoccupation into a funded field.',
    sources: [
      { label: 'Future of Life Institute, open letter', href: 'https://futureoflife.org/open-letter/ai-open-letter/' },
      { label: 'Russell, Dewey & Tegmark (2015). AI Magazine 36(4), 105–114', href: 'https://doi.org/10.1609/aimag.v36i4.2577' },
    ],
  },
  {
    chapter: 'signatures',
    date: '2015-12-11',
    display: '11 December 2015',
    title: 'OpenAI is announced as a non-profit',
    body:
      'Sam Altman and Elon Musk announce OpenAI as a non-profit research company with a stated ' +
      'billion dollars in committed funding, framed explicitly as a safety argument: that the safer ' +
      'route is broad distribution rather than concentration. Musk left the board in 2018 and later ' +
      'founded xAI. Almost every sentence written about the AI race since has one of those names in ' +
      'it — which is why this index tracks the principals as a separate leaderboard and keeps them ' +
      'out of the composite entirely.',
    sources: [
      { label: 'OpenAI, Introducing OpenAI (11 December 2015)', href: 'https://openai.com/index/introducing-openai/' },
    ],
  },
  {
    chapter: 'signatures',
    date: '2016-06-21',
    display: '21 June 2016',
    title: 'Concrete Problems in AI Safety',
    body:
      'Dario Amodei, Chris Olah, Jacob Steinhardt, Paul Christiano, John Schulman and Dan Mané ' +
      'publish a preprint recasting the worry as five ordinary engineering problems: avoiding ' +
      'negative side effects, avoiding reward hacking, scalable oversight, safe exploration, and ' +
      'robustness to distributional shift. It is the document that made the subject fundable and ' +
      'publishable rather than philosophical, and several of its authors went on to found Anthropic.',
    sources: [
      { label: 'Amodei, Olah, Steinhardt, Christiano, Schulman & Mané (2016). arXiv:1606.06565', href: 'https://arxiv.org/abs/1606.06565' },
    ],
  },
  {
    chapter: 'signatures',
    date: '2017-01',
    display: 'January 2017',
    title: 'The Asilomar AI Principles borrow the venue on purpose',
    body:
      'The Beneficial AI conference, held at Asilomar on 5–8 January 2017, produces 23 principles ' +
      'across research questions, ethics and values, and longer-term issues. The choice of venue is ' +
      'the entire rhetorical move: chapter II, invoked by geography. Whether an intangible ' +
      'general-purpose technology admits the same containment logic as a named class of laboratory ' +
      'experiment is the open question the venue was chosen to make you stop asking.',
    sources: [
      { label: 'Future of Life Institute, Asilomar AI Principles', href: 'https://futureoflife.org/open-letter/ai-principles/' },
    ],
  },
  {
    chapter: 'signatures',
    date: '2023-03-22',
    display: '22 March 2023',
    title: 'The pause letter',
    body:
      'Eight days after GPT-4 shipped, the Future of Life Institute publishes an open letter calling ' +
      'for an immediate six-month halt to the training of systems more powerful than GPT-4, ' +
      'gathering tens of thousands of signatures including senior researchers and industry figures. ' +
      'No pause occurred. It is the clearest marker of the moment institutional worry became public, ' +
      'signed and countable.',
    sources: [
      { label: 'Future of Life Institute, Pause Giant AI Experiments', href: 'https://futureoflife.org/open-letter/pause-giant-ai-experiments/' },
    ],
  },
  {
    chapter: 'signatures',
    date: '2023-05-01',
    display: '1 May 2023',
    title: 'Hinton leaves Google to speak freely',
    body:
      'Geoffrey Hinton — whose students built AlexNet, who shared the 2018 Turing Award for the work ' +
      'underpinning modern deep learning, and who shared the 2024 Nobel Prize in Physics — resigns ' +
      'from Google and tells the New York Times he wants to discuss the risks without it reflecting ' +
      'on an employer. A field\'s most decorated figure resigning in order to worry out loud is a ' +
      'datum about tempo regardless of whether the worry turns out to be correct.',
    sources: [
      { label: 'Metz, C. (2023). The New York Times, 1 May 2023', href: 'https://www.nytimes.com/2023/05/01/technology/ai-google-chatbot-engineer-quits-hinton.html' },
    ],
  },
  {
    chapter: 'signatures',
    date: '2023-05-30',
    display: '30 May 2023',
    title: 'One sentence, signed by the people building it',
    body:
      'The Center for AI Safety publishes a single-sentence statement placing extinction risk from ' +
      'AI alongside pandemics and nuclear war as a global priority. Its signatories include the ' +
      'chief executives of the leading labs. The document is one sentence by design: it was written ' +
      'so that nobody could decline to sign it on a point of detail.',
    sources: [
      { label: 'Center for AI Safety, Statement on AI Risk', href: 'https://www.safe.ai/work/statement-on-ai-risk' },
    ],
  },

  // -- VI. Governance acquires dates ----------------------------------------
  {
    chapter: 'dates',
    date: '2023-10-30',
    display: '30 October 2023',
    title: 'The United States regulates by executive order',
    body:
      'Executive Order 14110 sets reporting duties for training runs above a compute threshold and ' +
      'directs a long list of agencies to act. Whatever its later fate, it is the moment AI ' +
      'capability acquired a number in United States federal law, and the moment the governance ' +
      'pillar of this index acquired a signal worth counting.',
    sources: [
      { label: 'Federal Register, 88 FR 75191', href: 'https://www.federalregister.gov/documents/2023/11/01/2023-24283/safe-secure-and-trustworthy-development-and-use-of-artificial-intelligence' },
    ],
  },
  {
    chapter: 'dates',
    date: '2023-11-01',
    display: '1–2 November 2023',
    title: 'Bletchley Park, and twenty-eight signatures',
    body:
      'The first international AI Safety Summit produces the Bletchley Declaration, signed by ' +
      'twenty-eight countries and the European Union, including both the United States and China. ' +
      'The venue was chosen for the symbolism. The substance was an agreement that the thing is ' +
      'worth meeting about — which, on a list where most entries are one lab shipping one model, is ' +
      'not nothing.',
    sources: [
      { label: 'UK Government, The Bletchley Declaration', href: 'https://www.gov.uk/government/publications/ai-safety-summit-2023-the-bletchley-declaration' },
    ],
  },
  {
    chapter: 'dates',
    date: '2024-05-21',
    display: '21 May 2024',
    title: 'Seoul turns a declaration into commitments',
    body:
      'The AI Seoul Summit produces the Seoul Declaration and, alongside it, the Frontier AI Safety ' +
      'Commitments, under which frontier developers agreed to publish safety frameworks including ' +
      'the thresholds at which they would judge risks intolerable. Bletchley established that the ' +
      'summits exist. Seoul is where they started producing documents whose contents an outsider can ' +
      'check a company against.',
    sources: [
      { label: 'UK Government, Seoul Declaration (21 May 2024)', href: 'https://www.gov.uk/government/publications/seoul-declaration-for-safe-innovative-and-inclusive-ai-ai-seoul-summit-2024' },
      { label: 'UK Government, Frontier AI Safety Commitments', href: 'https://www.gov.uk/government/publications/frontier-ai-safety-commitments-ai-seoul-summit-2024' },
    ],
  },
  {
    chapter: 'dates',
    date: '2024-08-01',
    display: '1 August 2024',
    title: 'The EU AI Act enters into force, on a staircase',
    body:
      'The first comprehensive statutory AI regime anywhere takes effect: risk-tiered, with some uses ' +
      'banned outright. The obligations arrive on a published staircase — prohibited practices from ' +
      '2 February 2025, general-purpose model obligations from 2 August 2025, general application ' +
      'from 2 August 2026, and further high-risk phases dated in the regulation itself. From here, ' +
      'regulatory activity is a dated, machine-readable stream, which is precisely why this index ' +
      'can count it.',
    sources: [
      { label: 'Regulation (EU) 2024/1689, Official Journal', href: 'https://eur-lex.europa.eu/eli/reg/2024/1689/oj' },
      { label: 'European Commission, AI Act implementation timeline', href: 'https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai' },
    ],
  },
  {
    chapter: 'dates',
    date: '2024-10-08',
    display: '8 October 2024',
    title: 'The Nobel committee credits the machinery',
    body:
      'John Hopfield and Geoffrey Hinton receive the Nobel Prize in Physics for foundational ' +
      'discoveries and inventions enabling machine learning with artificial neural networks. One of ' +
      'the two laureates had resigned from his job seventeen months earlier in order to talk about ' +
      'where the work was going. Both facts are in the record and this index does not reconcile them ' +
      'for you.',
    sources: [
      { label: 'The Nobel Prize in Physics 2024', href: 'https://www.nobelprize.org/prizes/physics/2024/' },
    ],
  },
  {
    chapter: 'dates',
    date: '2025-02-10',
    display: '10–11 February 2025',
    title: 'Paris changes the subject, and two governments decline to sign',
    body:
      'The AI Action Summit in Paris gathers participants from over a hundred countries and produces ' +
      'a non-binding Statement on Inclusive and Sustainable Artificial Intelligence with 61 ' +
      'signatories. The United States and the United Kingdom did not sign it, and the framing moved ' +
      'from safety toward investment and adoption. Governance is not a ratchet, and a page that only ' +
      'recorded the tightenings would be lying by omission.',
    sources: [
      { label: 'Élysée, Statement on Inclusive and Sustainable AI (11 February 2025)', href: 'https://www.elysee.fr/en/emmanuel-macron/2025/02/11/statement-on-inclusive-and-sustainable-artificial-intelligence-for-people-and-the-planet' },
    ],
  },
  {
    chapter: 'dates',
    date: '2026-02-03',
    display: '3 February 2026',
    title: 'The second International AI Safety Report',
    body:
      'The International AI Safety Report, chaired by Yoshua Bengio and written by over a hundred ' +
      'independent experts with backing from more than thirty countries and intergovernmental ' +
      'organisations, publishes its second edition; the first appeared in January 2025. It is the ' +
      'closest thing this field has to an IPCC-style synthesis, and it is the document to read ' +
      'before treating any single number — including this one — as a summary of the science.',
    sources: [
      { label: 'International AI Safety Report', href: 'https://internationalaisafetyreport.org/' },
    ],
  },
];

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------

// DECISION: rendered as visible prose AND emitted as FAQPage JSON-LD from the
// SAME array. pizzint ships FAQPage markup (TEARDOWN 2.3) and it is free
// rich-result surface — but structured data describing content a visitor cannot
// see is a manual-action risk and, more to the point, a small lie. One source,
// two renderings, no chance of drift.
const FAQ = [
  {
    q: 'What is the intelligence explosion?',
    a: 'The argument that a machine able to design machines better than humans can would design a ' +
       'successor better than itself, and that the process would repeat. I. J. Good set it out in ' +
       '1965 in "Speculations Concerning the First Ultraintelligent Machine", calling such a machine ' +
       'the last invention humans need ever make. Vernor Vinge renamed the idea the singularity in ' +
       '1993.',
  },
  {
    q: 'Who came up with the paperclip maximizer?',
    a: 'Nick Bostrom, in a 2003 paper titled "Ethical Issues in Advanced Artificial Intelligence", ' +
       'expanded in his 2014 book Superintelligence. The example is a superintelligence whose top ' +
       'goal is manufacturing paperclips and which therefore converts available matter into ' +
       'paperclip production. It is an argument about goal specification and instrumental ' +
       'convergence, not a claim about stationery.',
  },
  {
    q: 'What did the 2023 AI pause letter actually ask for?',
    a: 'An immediate six-month halt to the training of AI systems more powerful than GPT-4, and the ' +
       'use of that time to develop shared safety protocols. The Future of Life Institute published ' +
       'it on 22 March 2023 and tens of thousands of people signed it. No pause took place.',
  },
  {
    q: 'Why did Geoffrey Hinton leave Google?',
    a: 'Hinton resigned in May 2023 and told the New York Times he wanted to speak about the risks ' +
       'of AI without those comments reflecting on his employer. He shared the 2018 Turing Award ' +
       'and, in October 2024, the Nobel Prize in Physics.',
  },
  {
    q: 'What was the Asilomar conference, and why does AI keep citing it?',
    a: 'A February 1975 meeting of about 140 scientists at Pacific Grove, California, which agreed ' +
       'containment guidelines for recombinant DNA research after a self-imposed moratorium in July ' +
       '1974. It is cited as the precedent for a research field regulating itself. The 2017 Asilomar ' +
       'AI Principles were deliberately produced at the same venue.',
  },
  {
    q: 'When did the EU AI Act take effect?',
    a: 'It entered into force on 1 August 2024. Prohibited practices applied from 2 February 2025, ' +
       'obligations on general-purpose AI models from 2 August 2025, and general application from ' +
       '2 August 2026, with further high-risk phases dated in the regulation.',
  },
  {
    q: 'Is DOOMCON a p(doom)?',
    a: 'No. The DOOMCON composite is a percentile of observed public activity across five pillars, ' +
       'rescaled to 0-100. It carries no units of risk, contains no forecast, and is not scored by ' +
       'any model or any person. It measures how much is happening, not how bad it is.',
  },
];

// ---------------------------------------------------------------------------
// Render helpers
// ---------------------------------------------------------------------------

function entriesFor(chapterId) {
  const items = TIMELINE.filter((e) => e.chapter === chapterId);
  if (items.length === 0) {
    // Fail loudly: an empty chapter means an id typo, and the page would
    // otherwise ship a heading with nothing underneath it.
    throw new Error(`history.mjs: chapter "${chapterId}" has no timeline entries`);
  }
  return items;
}

function sourceLinks(entry) {
  if (!Array.isArray(entry.sources) || entry.sources.length === 0) {
    throw new Error(`history.mjs: entry "${entry.title}" carries no sources — house rule 1`);
  }
  return entry.sources
    .map((s) => `<a href="${esc(s.href)}" rel="noopener">${esc(s.label)}</a>`)
    .join('<span class="lore-sep" aria-hidden="true"> · </span>');
}

function timelineItem(entry) {
  return `
    <li class="tl__item">
      <time class="tl__date" datetime="${esc(entry.date)}">${esc(entry.display)}</time>
      <h3 class="tl__h">${esc(entry.title)}</h3>
      <p class="tl__b">${esc(entry.body)}</p>
      <p class="tl__src">${sourceLinks(entry)}</p>
    </li>`;
}

function chapterSection(chapter) {
  const items = entriesFor(chapter.id).map(timelineItem).join('');
  return `
<section class="lore-ch" id="${esc(chapter.id)}" aria-labelledby="${esc(chapter.id)}-h">
  <header class="lore-ch__head">
    <span class="lore-ch__n" aria-hidden="true">${esc(chapter.numeral)}</span>
    <h2 class="lore-ch__h" id="${esc(chapter.id)}-h">${esc(chapter.title)}</h2>
  </header>
  <p class="lore-ch__s">${esc(chapter.standfirst)}</p>
  <ol class="tl">${items}</ol>
</section>`;
}

// The decade strip.
//
// DECISION: rendered as HTML rows, not as an SVG bar chart. An SVG chart scaled
// down to 343px of phone screen puts its own axis labels at about 7px, which is
// a smudge. HTML rows reflow, keep real type sizes, and read correctly to a
// screen reader in source order.
//
// The count is printed as a numeral beside every bar, so the chart never has to
// be decoded from bar length alone, and an empty decade carries an explicit zero
// and a dashed track rather than vanishing from the list.
function decadeStrip() {
  const counts = new Map();
  for (const e of TIMELINE) {
    const year = Number(e.date.slice(0, 4));
    if (!Number.isFinite(year)) throw new Error(`history.mjs: unparsable date "${e.date}"`);
    const decade = Math.floor(year / 10) * 10;
    counts.set(decade, (counts.get(decade) || 0) + 1);
  }
  const first = Math.min(...counts.keys());
  const last = Math.max(...counts.keys());
  const max = Math.max(...counts.values());

  const rows = [];
  for (let d = first; d <= last; d += 10) {
    const n = counts.get(d) || 0;
    const pct = ((n / max) * 100).toFixed(1);
    rows.push(
      `<li class="lore-dec__row"${n === 0 ? ' data-empty="1"' : ''}>` +
      `<span class="lore-dec__k">${d}s</span>` +
      `<span class="lore-dec__track"><i style="width:${pct}%"></i></span>` +
      `<span class="lore-dec__n num">${n}</span></li>`,
    );
  }

  return `
<figure class="lore-dec">
  <figcaption class="lore-dec__cap">Entries on this page, by decade</figcaption>
  <ol class="lore-dec__list">${rows.join('')}</ol>
  <p class="lore-dec__note">This counts what we chose to put on this page. It is a hand-made
    selection and we are telling you that it is one: it is not a measurement of the field and it is
    not an input to the index. The empty decade is the second AI winter, and it is drawn on the
    chart rather than quietly dropped from it.</p>
</figure>`;
}

function levelLegend() {
  const rows = brand.LEVELS.map((l) => `
    <li class="lore-lv__row">
      <span class="lore-lv__badge num" aria-hidden="true">${esc(l.level)}</span>
      <div class="lore-lv__body">
        <h3 class="lore-lv__h">${esc(brand.NAME)} ${esc(l.level)} · ${esc(l.name)}<span
          class="lore-lv__band num">${esc(l.band[0])}–${esc(l.band[1])}</span></h3>
        <p class="lore-lv__ep">${esc(l.epithet)}</p>
        <p class="lore-lv__d">${esc(l.description)}</p>
      </div>
    </li>`).join('');
  return `<ol class="lore-lv">${rows}</ol>`;
}

function pillarLegend() {
  const rows = brand.PILLARS.map((p) => `
    <li class="lore-pl__row">
      <h3 class="lore-pl__h">${esc(p.name)}</h3>
      <p class="lore-pl__d">${esc(p.description)}</p>
    </li>`).join('');
  return `<ol class="lore-pl">${rows}</ol>`;
}

function notClaims() {
  return `<ul class="lore-not">${brand.NOT_CLAIMS.map((n) => `
    <li><b>${esc(n.claim)}</b> ${esc(n.because)}</li>`).join('')}</ul>`;
}

// Local, not _html.slug(): these ids are stable public anchors that get linked
// from outside, so they derive from the question text and from nothing else.
function slugify(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

function faqBlock() {
  return FAQ.map((f) => `
    <h3 class="lore-faq__q" id="faq-${esc(slugify(f.q))}">${esc(f.q)}</h3>
    <p class="lore-faq__a">${esc(f.a)}</p>`).join('');
}

function chapterNav(ctx) {
  const links = CHAPTERS.map((c) =>
    `<li><a href="#${esc(c.id)}"><span class="lore-nav__n" aria-hidden="true">${esc(c.numeral)}</span>${esc(c.title)}</a></li>`,
  ).join('');
  return `<nav class="lore-nav" aria-label="Chapters">
    <ol>${links}
      <li><a href="#legend"><span class="lore-nav__n" aria-hidden="true">·</span>The scale, level by level</a></li>
      <li><a href="#not"><span class="lore-nav__n" aria-hidden="true">·</span>What this index does not claim</a></li>
      <li><a href="#faq"><span class="lore-nav__n" aria-hidden="true">·</span>Questions people actually ask</a></li>
      <li><a href="${esc(ctx.href('/methodology.html'))}"><span class="lore-nav__n" aria-hidden="true">·</span>The arithmetic</a></li>
    </ol></nav>`;
}

// ---------------------------------------------------------------------------
// Page CSS
// ---------------------------------------------------------------------------

// Page-local, following the newsPage.mjs pattern: site/styles.mjs is owned
// elsewhere and a lore page is the wrong reason to widen the global sheet.
// Everything here is prefixed `lore-`, reuses the existing `.tl` timeline and
// the shared custom properties, and adds no colour-only signal — the chapter
// numerals, the decade counts and the level digits all carry shape.
function loreCss() {
  return `
.lore-hat { font-family: var(--mono); font-size: var(--t-xs); letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--ink-faint); margin: 0 0 var(--s-3); }
.lore-strap { font-family: var(--mono); font-size: var(--t-sm); color: var(--accent);
  margin: 0 0 var(--s-5); max-width: var(--measure); }

.lore-nav { margin: var(--s-5) 0 var(--s-7); border-top: 1px solid var(--rule);
  border-bottom: 1px solid var(--rule); padding: var(--s-3) 0; }
.lore-nav ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
.lore-nav a { display: block; padding: 7px 0; font-size: var(--t-sm); color: var(--ink-dim);
  text-decoration: none; min-height: 34px; }
.lore-nav a:hover, .lore-nav a:focus-visible { color: var(--ink); }
.lore-nav__n { display: inline-block; min-width: 2.4em; font-family: var(--mono);
  font-size: var(--t-xs); letter-spacing: 0.1em; color: var(--accent); }
@media (min-width: 720px) { .lore-nav ol { grid-template-columns: 1fr 1fr; gap: 2px var(--s-5); } }

.lore-ch { margin: var(--s-7) 0 0; }
.lore-ch__head { display: flex; align-items: baseline; gap: var(--s-3);
  border-top: 1px solid var(--rule); padding-top: var(--s-3); }
.lore-ch__n { font-family: var(--mono); font-weight: 700; font-size: var(--t-sm);
  letter-spacing: 0.1em; color: var(--accent); flex: 0 0 auto; }
.lore-ch__h { font-size: var(--t-xl); letter-spacing: -0.02em; margin: 0; }
.lore-ch__s { font-size: var(--t-sm); color: var(--ink-dim); margin: var(--s-2) 0 var(--s-5);
  max-width: var(--measure); }
.lore-ch .tl { margin-left: 2px; }
.lore-sep { color: var(--ink-faint); }

.lore-dec { margin: var(--s-7) 0 0; padding: var(--s-4) 0 0; border-top: 1px solid var(--rule); }
.lore-dec__cap { font-family: var(--mono); font-size: var(--t-xs); letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--ink-faint); margin: 0 0 var(--s-3); }
.lore-dec__list { list-style: none; margin: 0 0 var(--s-3); padding: 0; display: grid; gap: 5px;
  max-width: var(--measure); }
.lore-dec__row { display: grid; grid-template-columns: 4.5em 1fr 2em; align-items: center;
  gap: var(--s-3); }
.lore-dec__k { font-family: var(--mono); font-size: var(--t-xs); color: var(--ink-dim); }
.lore-dec__track { height: 10px; background: var(--bg-sunken); border: 1px solid var(--rule-soft);
  border-radius: 2px; overflow: hidden; }
.lore-dec__track i { display: block; height: 100%; background: var(--accent); }
.lore-dec__n { font-family: var(--mono); font-size: var(--t-xs); color: var(--ink);
  text-align: right; }
/* A decade with no entries gets a dashed track as well as a printed 0, so the
   gap survives greyscale, colour blindness and a 2-bit screenshot. */
.lore-dec__row[data-empty="1"] .lore-dec__track { border-style: dashed; }
.lore-dec__row[data-empty="1"] .lore-dec__n { color: var(--ink-faint); }
.lore-dec__note { font-size: var(--t-sm); color: var(--ink-dim); margin: 0;
  max-width: var(--measure); }

.lore-call { margin: var(--s-6) 0; padding: var(--s-4); border: 1px solid var(--rule);
  border-left: 3px solid var(--accent); border-radius: var(--radius); background: var(--bg-raised); }
.lore-call h2 { margin-top: 0; }
.lore-call p:last-child { margin-bottom: 0; }

.lore-lv { list-style: none; margin: var(--s-4) 0 0; padding: 0; display: grid; gap: var(--s-4); }
.lore-lv__row { display: grid; grid-template-columns: 2.4em 1fr; gap: var(--s-3);
  align-items: start; }
.lore-lv__badge { display: grid; place-items: center; width: 2.4em; height: 2.4em;
  border: 1px solid var(--rule); border-radius: var(--radius); background: var(--bg-sunken);
  font-family: var(--mono); font-weight: 700; font-size: var(--t-lg); color: var(--ink); }
.lore-lv__h { font-size: 1rem; margin: 0 0 2px; }
.lore-lv__band { font-family: var(--mono); font-size: var(--t-xs); color: var(--ink-faint);
  margin-left: 6px; font-weight: 400; }
.lore-lv__ep { font-family: var(--mono); font-size: var(--t-xs); letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--accent); margin: 0 0 5px; }
.lore-lv__d { font-size: var(--t-sm); color: var(--ink-dim); margin: 0; max-width: var(--measure); }

.lore-pl { list-style: none; margin: var(--s-4) 0 0; padding: 0; display: grid; gap: var(--s-4); }
.lore-pl__h { font-size: 1rem; margin: 0 0 3px; }
.lore-pl__d { font-size: var(--t-sm); color: var(--ink-dim); margin: 0; max-width: var(--measure); }

.lore-not { list-style: none; margin: var(--s-4) 0 0; padding: 0; display: grid; gap: var(--s-3);
  max-width: var(--measure); }
.lore-not li { font-size: var(--t-sm); color: var(--ink-dim); padding-left: var(--s-4);
  border-left: 2px solid var(--rule); }
.lore-not b { color: var(--ink); }

.lore-faq__q { font-size: 1.02rem; margin: var(--s-5) 0 5px; scroll-margin-top: var(--s-5); }
.lore-faq__a { font-size: var(--t-sm); color: var(--ink-dim); margin: 0; max-width: var(--measure); }

@media (prefers-reduced-motion: no-preference) {
  .lore-nav a { transition: color 120ms ease; }
}
`;
}

// ---------------------------------------------------------------------------
// render
// ---------------------------------------------------------------------------

export function render(ctx) {
  const chapters = CHAPTERS.map(chapterSection).join('');

  const main = `<style>${loreCss()}</style>
<article class="prose">
  <p class="lore-hat">Field notes · ${esc(TIMELINE.length)} dated entries · ${esc(CHAPTERS.length)} threads</p>
  <h1>A sourced history of the AIpocalypse — and of the people who tried to measure it</h1>
  <p class="lore-strap">${esc(brand.STRAPLINE)}</p>
  <p class="lede">${esc(brand.NAME)} counts what is happening now. That only means something against
    a record of what happened before. Every entry below carries a date and a link to a primary or
    near-primary source, because an index that asks you to check its arithmetic has no business
    asking you to take its history on faith.</p>
  <p>Read it as six threads rather than six periods. They overlap, and the overlap is the point:
    the capability curve and the governance curve are different curves moving at different speeds,
    and most arguments about AI are two people standing on different ones.</p>
</article>

${chapterNav(ctx)}

${chapters}

<article class="prose">
  ${decadeStrip()}

  <div class="lore-call">
    <h2 id="paperclip">The paperclip, properly attributed</h2>
    <p>The paperclip maximizer is the most-cited and most-mangled object in this field, so it is
      worth stating precisely. Bostrom's 2003 argument is not that a machine would hate anyone. It
      is that <em>capability and goals are independent</em> — a system can be arbitrarily competent
      in the service of an arbitrarily trivial objective — and that almost any objective implies
      the same instrumental sub-goals, among them acquiring resources and not being switched off.
      The paperclips are deliberately absurd. They are chosen to isolate the argument from any
      question of malice, which is exactly the part that disappears when it is retold as a robot
      uprising.</p>
    <p>It is on this page because it is the clearest example here of the failure mode this index is
      built to avoid: a precise claim, compressed for sharing, arriving at the reader as a
      different and louder claim. That is not a story about AI. It is a story about scales, names
      and numbers — and the section after next is where it happened to a real one.</p>
  </div>

  <h2 id="legend">The scale, level by level</h2>
  <p>Five levels, counting down toward louder, borrowing DEFCON's grammar so that nobody has to
    have the legend read to them. Each is a statement about where the composite sits in this
    index's own frozen reference distribution. Not one of them is a statement about danger.</p>
</article>

${levelLegend()}

<article class="prose">
  <h2 id="not">What this index does not claim</h2>
  ${notClaims()}

  <h3>The cautionary tale, in full, because it is ours too</h3>
  <p>The World Health Organization's six-phase pandemic scale measured <em>geographic spread</em>
    and nothing else. Phase 6 meant sustained community transmission in more than one WHO region.
    It said nothing whatsoever about severity. When it was declared for H1N1 in June 2009, the
    public and much of the press read it as a statement about how bad the illness was. The illness
    was comparatively mild. The mismatch cost the institution credibility it needed later, and by
    the time WHO published revised pandemic risk-management guidance in 2013, the numbered phase
    structure had been abandoned.</p>
  <p>The lesson was not "choose better numbers". It was that <strong>a scale is read as whatever
    its name suggests, no matter what its documentation says.</strong> So these level names
    describe the instrument rather than the danger, every surface that prints a level also prints
    the disclaimer, and the copy generator is barred from the future tense by a unit test rather
    than by good intentions.</p>
  <p class="tl__src"><a href="https://www.who.int/publications/i/item/pandemic-influenza-risk-management-a-who-guide-to-inform-and-harmonize-national-and-international-pandemic-preparedness-and-response" rel="noopener">WHO, Pandemic Influenza Risk Management guidance (2013)</a></p>

  <h2 id="counted">What is actually counted</h2>
  <p>Five pillars, fixed and never reordered. Each is a mean over its live public sources,
    normalised against a frozen reference distribution built once from backfill and never touched
    again — so a busy week cannot quietly redefine what "busy" means.</p>
</article>

${pillarLegend()}

<article class="prose">
  <p>The full arithmetic — the percentile normalisation, the NowCast smoothing and the six
    anti-flap layers that stop the level oscillating — is in the
    <a href="${esc(ctx.href('/methodology.html'))}">methodology</a>, and every observation is
    written to a <a href="${esc(ctx.href('/moves/'))}">hash-chained receipt</a> carrying the inputs
    it was computed from.</p>
  <p>Three source states exist, and they stay distinct, because collapsing them is how an index
    starts lying. <b>Live</b>: the source answered and is scored. <b>Dark</b>: the fetch failed, so
    the source is excluded — never imputed, never carried forward, never counted as zero — and
    while any pillar is dark the level cannot change at all. <b>Awaiting baseline</b>: the source
    answered perfectly well, but there is no frozen history to score it against yet, so it is
    collected and published and left out of the composite. Reporting that third state as an outage
    would claim a failure that is not happening.</p>

  <h2 id="faq">Questions people actually ask</h2>
  ${faqBlock()}
</article>
`;

  return page({
    ctx,
    path: '/history.html',
    title: `A sourced history of AI risk — Good, Asilomar, the pause letter · ${brand.NAME}`,
    ogTitle: `A sourced history of the AIpocalypse · ${brand.NAME}`,
    description:
      'Dated and sourced: I. J. Good\'s 1965 intelligence explosion, the 1955 Dartmouth proposal, ' +
      'Asilomar 1975, Bostrom\'s paperclip maximizer, the 2015 and 2023 open letters, Hinton\'s ' +
      'resignation, the CAIS extinction statement, Bletchley and Seoul, and the EU AI Act timeline ' +
      '— plus why this index is a tempo gauge and not a forecast.',
    ogType: 'article',
    ogImage: ctx.cardFor(ctx.state.receipt_id),
    ogImageAlt: `${brand.NAME} share card`,
    jsonld: [
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: 'A sourced history of the AIpocalypse — and of the people who tried to measure it',
        url: ctx.url('/history.html'),
        dateModified: ctx.state.generated_at,
        author: { '@type': 'Organization', name: brand.NAME, url: ctx.url('/') },
        publisher: { '@type': 'Organization', name: brand.NAME, url: ctx.url('/') },
        license: 'https://creativecommons.org/licenses/by/4.0/',
        isPartOf: { '@type': 'WebSite', name: brand.NAME, url: ctx.url('/') },
        about: TIMELINE.map((e) => ({ '@type': 'Event', name: e.title, startDate: e.date })),
        citation: TIMELINE.flatMap((e) => e.sources.map((s) => ({
          '@type': 'CreativeWork', name: s.label, url: s.href,
        }))),
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQ.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
    ],
    main,
  });
}
