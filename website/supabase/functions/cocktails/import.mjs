// Conservative recipe draft extraction; original source is preserved privately. Owner review is required before save.
export function sourceURL(value) {
  const url = new URL(value);
  if (!['https:','http:'].includes(url.protocol) || url.username || url.password || value.length > 2000) throw Error('Use a normal http or https source link.');
  return url.href;
}
export function redditJSONURL(value) {
  const url = new URL(sourceURL(value));
  if (url.protocol !== 'https:' || url.port) return null;
  let id;
  if (url.hostname === 'redd.it') id = url.pathname.match(/^\/([a-z0-9]+)\/?$/i)?.[1];
  else if (['reddit.com','www.reddit.com','old.reddit.com'].includes(url.hostname)) id = url.pathname.match(/^\/(?:r\/cocktails\/)?comments\/([a-z0-9]+)(?:\/|$)/i)?.[1];
  return id ? `https://www.reddit.com/r/cocktails/comments/${id}.json?raw_json=1` : null;
}
const quantity = /(?:\d|[¼½¾⅓⅔⅛⅜⅝⅞])[^\n]{0,28}\b(?:oz|ounces?|ml|cl|tsp|tbsp|teaspoons?|tablespoons?|cups?|dashes?|drops?|parts?|barspoons?|slices?|eggs?|leaves|sprigs?)\b/i;
// Only likely preparation lines enter the method draft; trailing source prose stays in sourceText.
const preparation = /^(?:(?:method|instructions|preparation|directions|garnish|technique)\s*:|(?:(?:dry|double|reverse[- ]dry)\s+)?(?:shake|stir|strain|combine|add|pour|muddle|build|mix|blend|serve|garnish|top|float|fill|chill|rinse|express|squeeze|rim|rub|whisk|heat|simmer|steep|infuse|dissolve|cool|refrigerate|discard)\b)/i;
const strip = s => s.replace(/^\s*(?:[-*+]\s+|\d+[.)]\s+)/,'').replace(/\*\*/g,'').trim();
export function parseRecipeText(text, title = '') {
  if (typeof text !== 'string' || text.length > 100000) throw Error('Paste up to 100,000 characters of source text.');
  let heading = 'Recipe', ingredients = [], method = [], specs = [];
  function finish() { if(ingredients.length) specs.push({name:heading, ingredientsText:ingredients.join('\n'), instructions:method.join('\n')}); ingredients=[];method=[]; }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const isHeading = /^#{1,6}\s+/.test(line) || /^\*\*[^*]+\*\*\s*:?$/.test(line);
    if (isHeading) {
      const h = strip(line.replace(/^#{1,6}\s+/,''));
      if (/^(method|instructions|preparation|directions|garnish)\b/i.test(h)) { if(ingredients.length) method.push(h); continue; }
      finish();heading=h;continue;
    }
    if (quantity.test(line)) ingredients.push(strip(line));
    else if (ingredients.length && preparation.test(strip(line))) method.push(strip(line));
  }
  finish();
  if (!specs.length) specs=[{name:'Recipe',ingredientsText:'',instructions:''}];
  const year = Number((title+'\n'+text).match(/\b(20\d{2})\b/)?.[1]) || null;
  const day = Number((title+'\n'+text).match(/\b(?:day|cocktail|december)\s*#?\s*(\d{1,2})\b/i)?.[1]) || null;
  return {name:title || (specs[0].name !== 'Recipe' ? specs[0].name : ''),year,day:day>=1&&day<=24?day:null,specs,warnings:['Check the drink name, day, every measure, and each variant against the source. Unusual formatting may need manual corrections. Keep only ingredients and concise preparation steps; omit source stories and article text.'],sourceText:text};
}
export function validateDraft(input) {
  if (!input || input.reviewed !== true) throw Error('Review the recipe and confirm it before saving.');
  const year=Number(input.year),day=Number(input.day);
  if (!Number.isInteger(year)||year<2020||year>2100||!Number.isInteger(day)||day<1||day>24) throw Error('Choose a year from 2020–2100 and an Advent day from 1–24.');
  const name=String(input.name||'').trim();
  if (!name || name.length>200) throw Error('Enter a drink name, up to 200 characters.');
  const url=sourceURL(input.sourceURL);
  if (!Array.isArray(input.specs)||!input.specs.length||input.specs.length>20) throw Error('Add between 1 and 20 separate recipe variants.');
  const specs=input.specs.map(s=>{
    const name=String(s.name||'').trim(),ingredientsText=String(s.ingredientsText||'').trim(),instructions=String(s.instructions||'').trim();
    if (!name||name.length>200||!ingredientsText||ingredientsText.length>12000||instructions.length>20000) throw Error('Each variant needs a name and ingredients with quantities. Keep instructions under 20,000 characters.');
    return {name,ingredientsText,instructions,tags:String(s.tags||'').slice(0,3000)};
  });
  const sourceText=String(input.sourceText||'');
  if(sourceText.length>100000) throw Error('Source text is too long.');
  return {name,year,day,sourceURL:url,sourceText,specs};
}
export function inferIngredients(text, catalog) {
  const lower=text.toLowerCase();
  const found=catalog.filter(i=>new RegExp('(?:^|[^a-z])'+i.name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?:$|[^a-z])').test(lower));
  const families={Gin:/\b(gin|genever)\b/,Rum:/\b(rum|rhum|cachaça)\b/,Whiskey:/\b(whiskey|whisky|bourbon|rye|scotch)\b/,Brandy:/\b(brandy|cognac|calvados|applejack|pisco)\b/,Tequila:/\btequila\b/,Vermouth:/\bvermouth\b/,Chartreuse:/\bchartreuse\b/,'Orange liqueur':/\b(cointreau|curacao|curaçao|triple sec|orange liqueur)\b/};
  for(const [name,re] of Object.entries(families))if(re.test(lower)){const broad=catalog.find(i=>i.name===name);if(broad&&!found.some(i=>i.name===name))found.push(broad);}
  return found;
}
