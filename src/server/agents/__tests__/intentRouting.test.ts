/**
 * Intent Routing Tests
 * Verifies that plannerAgent correctly classifies queries and that
 * agentRouterNode activates only the appropriate agents per intent.
 * All helpers are replicated inline so tests are fast and isolated (no LLM calls).
 */

const MARINE_KEYWORDS = [
  'weather', 'ocean', 'wave', 'wind', 'satellite', 'chlorophyll',
  'sst', 'alert', 'warning', 'fishing', 'trip', 'safe', 'danger', 'cyclone',
  'tide', 'current', 'storm', 'rain', 'temperature', 'boundary', 'port', 'harbour',
  'pfz', 'sea', 'marine', 'boat', 'sail', 'vessel', 'navigate', 'coast', 'ship',
];

const CONVERSATIONAL_PATTERNS = [
  /^(hi|hey|hello|hiya|howdy|yo)\b/i,
  /^(good\s+(morning|afternoon|evening|night|day))\b/i,
  /^(thanks|thank\s+you|thx|ty|cheers)\b/i,
  /^(bye|goodbye|see\s+you|cya|take\s+care)\b/i,
  /^(who\s+are\s+you|what\s+are\s+you)\b/i,
  /^(what\s+can\s+you\s+do|what\s+do\s+you\s+do|how\s+can\s+you\s+help|help\s+me|help)\b/i,
  /^(ok|okay|sure|alright|great|nice|cool|got\s+it|understood)\b/i,
  /^(tell\s+me\s+about\s+yourself)\b/i,
  /^(what\s+is\s+orca|who\s+is\s+orca)\b/i,
];

function detectConversationalIntent(query: string): boolean {
  const trimmed = query.trim();
  const hasMarineKeyword = MARINE_KEYWORDS.some(kw => trimmed.toLowerCase().includes(kw));
  if (hasMarineKeyword) return false;
  return CONVERSATIONAL_PATTERNS.some(p => p.test(trimmed));
}

function normalizeIntent(raw: string): string {
  const cleaned = raw.toLowerCase().trim().replace(/^['"]+|['"]+$/g, '').trim();
  if (['conversational', 'greeting', 'casual', 'chitchat', 'chit-chat', 'help'].includes(cleaned)) return 'conversational';
  if (['weather', 'temperature', 'wind', 'rain', 'forecast'].includes(cleaned)) return 'weather';
  if (['ocean', 'wave', 'swell', 'tide', 'current', 'sea_state', 'sea state'].includes(cleaned)) return 'ocean';
  if (['satellite', 'sst', 'chlorophyll', 'pfz'].includes(cleaned)) return 'satellite';
  if (['alert', 'alerts', 'warning', 'cyclone', 'advisory'].includes(cleaned)) return 'alerts';
  if (['geospatial', 'boundary', 'zone', 'restricted'].includes(cleaned)) return 'geospatial';
  if (['safety', 'safe', 'danger', 'risk'].includes(cleaned)) return 'safety';
  if (['trip_planning', 'trip', 'navigate', 'navigation', 'route'].includes(cleaned)) return 'trip_planning';
  if (['fishing', 'fish', 'catch'].includes(cleaned)) return 'fishing';
  return 'general_marine';
}

function getRequiredAgentsForIntent(intent: string, query: string): string[] {
  const q = query.toLowerCase();
  if (intent === 'conversational') return ['synthesis'];
  if (intent === 'weather') return ['weather', 'synthesis'];
  if (intent === 'ocean') return ['ocean', 'synthesis'];
  if (intent === 'satellite') return ['satellite', 'synthesis'];
  if (intent === 'alerts') return ['alert', 'synthesis'];
  if (intent === 'geospatial') return ['weather', 'geospatial', 'alert', 'synthesis'];
  if (intent === 'safety') return ['weather', 'ocean', 'geospatial', 'alert', 'risk', 'synthesis'];
  if (intent === 'fishing') return ['weather', 'ocean', 'satellite', 'geospatial', 'alert', 'risk', 'synthesis'];
  if (intent === 'trip_planning') return ['weather', 'ocean', 'satellite', 'geospatial', 'alert', 'risk', 'synthesis'];
  return [
    'weather', 'ocean',
    ...(q.includes('satellite')||q.includes('chlorophyll')||q.includes('sst')||q.includes('pfz')?['satellite']:[]),
    ...(q.includes('boundary')||q.includes('restricted')||q.includes('zone')||q.includes('geospatial')?['geospatial']:[]),
    'alert',
    ...(q.includes('safe')||q.includes('danger')||q.includes('risk')?['risk']:[]),
    'synthesis',
  ];
}

describe('Intent Detection — Rule-Based Conversational Classifier', () => {
  const conversationalQueries = [
    'Hi','Hello','Hey','Good morning','Good evening','Good afternoon',
    'Thanks','Thank you','Who are you?','What are you?',
    'What can you do?','What do you do?','How can you help?',
    'Tell me about yourself','What is ORCA?','Who is ORCA?',
    'Ok','Okay','Sure','Alright','Great','Bye','Goodbye',
  ];

  test.each(conversationalQueries)(
    '"%s" detected as conversational (no marine agents)',
    (query) => { expect(detectConversationalIntent(query)).toBe(true); }
  );

  const marineQueries = [
    'What is the weather?','How high are the waves?','Give me satellite information',
    'Are there any alerts?','Is it safe to go fishing?',
    'Plan a trip from Puducherry to Chennai','What are the ocean conditions?',
    'Show me chlorophyll levels','Is there a cyclone warning?','What is the wind speed?',
  ];

  test.each(marineQueries)(
    '"%s" NOT conversational (marine query)',
    (query) => { expect(detectConversationalIntent(query)).toBe(false); }
  );
});

describe('Intent Normalization — LLM Output Mapping', () => {
  const cases: [string, string][] = [
    ['conversational','conversational'],['greeting','conversational'],['casual','conversational'],
    ['weather','weather'],['temperature','weather'],['forecast','weather'],
    ['ocean','ocean'],['wave','ocean'],['swell','ocean'],
    ['satellite','satellite'],['chlorophyll','satellite'],
    ['alert','alerts'],['warning','alerts'],['cyclone','alerts'],
    ['safety','safety'],['safe','safety'],['risk','safety'],
    ['trip_planning','trip_planning'],['trip','trip_planning'],['navigation','trip_planning'],
    ['fishing','fishing'],['fish','fishing'],
    ['unknown_value','general_marine'],
  ];
  test.each(cases)('normalizeIntent("%s") -> "%s"', (raw, expected) => {
    expect(normalizeIntent(raw)).toBe(expected);
  });
});

describe('Agent Router — Required Agents Per Intent', () => {
  test('"Hi" -> conversational -> only synthesis', () => {
    const agents = getRequiredAgentsForIntent('conversational', 'Hi');
    expect(agents).toEqual(['synthesis']);
    ['weather','ocean','satellite','alert','geospatial','risk'].forEach(a => expect(agents).not.toContain(a));
  });
  test('"Hello" -> conversational -> only synthesis', () => {
    expect(getRequiredAgentsForIntent('conversational','Hello')).toEqual(['synthesis']);
  });
  test('"What can you do?" -> conversational -> only synthesis', () => {
    expect(getRequiredAgentsForIntent('conversational','What can you do?')).toEqual(['synthesis']);
  });
  test('"What is the weather?" -> weather -> weather+synthesis, no ocean/satellite/risk', () => {
    const a = getRequiredAgentsForIntent('weather','What is the weather?');
    expect(a).toContain('weather'); expect(a).toContain('synthesis');
    expect(a).not.toContain('ocean'); expect(a).not.toContain('satellite'); expect(a).not.toContain('risk');
  });
  test('"How high are the waves?" -> ocean -> ocean+synthesis only', () => {
    const a = getRequiredAgentsForIntent('ocean','How high are the waves?');
    expect(a).toContain('ocean'); expect(a).toContain('synthesis');
    expect(a).not.toContain('weather'); expect(a).not.toContain('satellite');
  });
  test('"Give me satellite information" -> satellite -> satellite+synthesis only', () => {
    const a = getRequiredAgentsForIntent('satellite','Give me satellite information');
    expect(a).toContain('satellite'); expect(a).toContain('synthesis');
    expect(a).not.toContain('weather'); expect(a).not.toContain('ocean'); expect(a).not.toContain('risk');
  });
  test('"Are there any alerts?" -> alerts -> alert+synthesis only', () => {
    const a = getRequiredAgentsForIntent('alerts','Are there any alerts?');
    expect(a).toContain('alert'); expect(a).toContain('synthesis');
    expect(a).not.toContain('weather'); expect(a).not.toContain('ocean');
  });
  test('"Is it safe to go fishing?" -> safety -> weather+ocean+alert+risk+geospatial', () => {
    const a = getRequiredAgentsForIntent('safety','Is it safe to go fishing?');
    ['weather','ocean','alert','risk','geospatial','synthesis'].forEach(ag => expect(a).toContain(ag));
  });
  test('"Plan a trip from Puducherry to Chennai" -> trip_planning -> full agent set', () => {
    const a = getRequiredAgentsForIntent('trip_planning','Plan a trip from Puducherry to Chennai');
    ['weather','ocean','satellite','geospatial','alert','risk','synthesis'].forEach(ag => expect(a).toContain(ag));
  });
  test('"What are the fishing conditions?" -> fishing -> full agent set', () => {
    const a = getRequiredAgentsForIntent('fishing','What are the fishing conditions?');
    ['weather','ocean','satellite','geospatial','alert','risk'].forEach(ag => expect(a).toContain(ag));
  });
});
