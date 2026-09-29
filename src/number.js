// Αυστηρή ανάγνωση αριθμών όπως τους γράφει ο χρήστης (ελληνική γραφή: 1.234,50).
// Κανόνας: ποτέ σιωπηλά λάθος τιμή — ό,τι είναι αμφίσημο ή άκυρο επιστρέφει {error}, όχι αριθμό.

const count = (s, ch) => s.split(ch).length - 1;

/**
 * @returns {{value:number}|{error:string}}
 *  «1.234,50» → 1234.5 · «1234,50» → 1234.5 · «12.50» → 12.5 · «1.234.567» → 1234567
 *  «1.234» → error (χίλια διακόσια ή 1,234;) · «1,234» με maxDecimals 2 → error · «12a» → error
 */
export function parseAmount(input, {maxDecimals = 2, allowZero = false} = {}){
  const s = String(input ?? '').replace(/[\s €]/g, '');
  if(!s) return {error: 'Γράψε έναν αριθμό.'};
  if(!/^\d[\d.,]*$/.test(s) || /[.,]$/.test(s)) return {error: `«${input}» δεν είναι αριθμός.`};

  let intPart, decPart = '';
  const dots = count(s, '.'), commas = count(s, ',');
  if(dots && commas){
    // Και τα δύο: το τελευταίο είναι η υποδιαστολή, το άλλο πρέπει να χωρίζει σωστά χιλιάδες.
    const dec = s.lastIndexOf(',') > s.lastIndexOf('.') ? ',' : '.', thou = dec === ',' ? '.' : ',';
    if(count(s, dec) > 1) return {error: `«${input}»: περισσότερες από μία υποδιαστολές.`};
    const [i, d] = s.split(dec);
    if(!new RegExp(`^\\d{1,3}(\\${thou}\\d{3})+$`).test(i)) return {error: `«${input}»: λάθος διαχωρισμός χιλιάδων.`};
    intPart = i.split(thou).join(''); decPart = d;
  } else if(commas){
    if(commas > 1) return {error: `«${input}»: ασαφές — γράψε π.χ. 1234,50.`};
    [intPart, decPart] = s.split(',');                       // κόμμα = υποδιαστολή
  } else if(dots){
    if(/^\d{1,3}(\.\d{3})+$/.test(s)){
      if(dots > 1) intPart = s.split('.').join('');           // 1.234.567: σίγουρα χιλιάδες
      else return {error: `«${input}»: ασαφές — εννοείς ${s.replace('.', '')} ή ${s.replace('.', ',')}; Γράψε το χωρίς τελεία ή με κόμμα.`};
    } else if(dots === 1) [intPart, decPart] = s.split('.');  // 12.50: υποδιαστολή
    else return {error: `«${input}» δεν είναι αριθμός.`};
  } else intPart = s;

  if(decPart.length > maxDecimals) return {error: `«${input}»: έως ${maxDecimals} δεκαδικά.`};
  const value = Number(intPart + (decPart ? '.' + decPart : ''));
  if(!Number.isFinite(value)) return {error: `«${input}» δεν είναι αριθμός.`};
  if(value <= 0 && !allowZero) return {error: 'Πρέπει να είναι μεγαλύτερο από 0.'};
  return {value};
}

export const toCents = v => Math.round(v * 100);
export const formatEur = v => v.toLocaleString('el-GR', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' €';
export const formatQty = v => v.toLocaleString('el-GR', {maximumFractionDigits: 3});
