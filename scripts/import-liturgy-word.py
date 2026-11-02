"""Import the owner's Word text and formatting without editorial substitutions.

Usage: python scripts/import-liturgy-word.py OWNER.docx [--scan-source ORIGINAL_SCAN_JSON]
The retained scan transcription and Git history remain untouched.
"""
import argparse, collections, difflib, hashlib, json, re, unicodedata, zipfile
from pathlib import Path
from lxml import etree

ROOT=Path(__file__).resolve().parents[1]
NS={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
W='{'+NS['w']+'}'
parser=argparse.ArgumentParser();parser.add_argument('document',type=Path);parser.add_argument('--scan-source',type=Path);args=parser.parse_args()
raw=args.document.read_bytes();sha=hashlib.sha256(raw).hexdigest()
old_path=ROOT/'content/divine-liturgy.json';old_bytes=(args.scan_source or old_path).read_bytes();old=json.loads(old_bytes)
assert old['source_edition']!='owner_provided_word', 'Use --scan-source with the original scan JSON to preserve its provenance and edition comparison'
with zipfile.ZipFile(args.document) as archive:
    body=etree.fromstring(archive.read('word/document.xml')).find('w:body',NS)
    note_xml=etree.fromstring(archive.read('word/footnotes.xml'))

def runs_of(p):
    runs=[]
    for rr in p.findall('w:r',NS):
        text=''.join(rr.xpath('./w:t/text()',namespaces=NS))
        ref=rr.find('w:footnoteReference',NS)
        if ref is not None:
            runs.append({'text':'','ink':'black','footnote_ref':int(ref.get(W+'id'))});continue
        if not text:continue
        pr=rr.find('w:rPr',NS);color=pr.find('w:color',NS) if pr is not None else None
        red=color is not None and color.get(W+'val','').upper()=='FF0000'
        def enabled(name):
            e=pr.find('w:'+name,NS) if pr is not None else None
            return e is not None and e.get(W+'val','1') not in ['0','false','off']
        runs.append({'text':text,'ink':'red' if red else 'black','bold':enabled('b'),'italic':enabled('i')})
    return runs

records=[];paragraph_index=-1
for child in body:
    if child.tag==W+'p':
        paragraph_index+=1;runs=runs_of(child);text=''.join(x['text'] for x in runs)
        if not text.strip() or text.strip()=='✠':continue
        style=child.find('w:pPr/w:pStyle',NS);style=style.get(W+'val') if style is not None else 'Normal'
        if style=='Subtitle' and records and records[-1]['type']=='heading':
            records[-1]['runs'] += [{'text':' ','ink':'black'},*runs]
            records[-1]['text']+=' '+text;records[-1]['word_paragraphs'].append(paragraph_index);continue
        kind='variant' if style=='Heading3' else 'heading' if style in ['Title','Heading1','Heading2'] else 'rubric' if all(x['ink']=='red' for x in runs if x['text'].strip()) else 'speech'
        boxed=child.find('w:pPr/w:pBdr',NS) is not None
        records.append({'type':kind,'runs':runs,'text':text,'word_paragraphs':[paragraph_index],'source_boxed':boxed})
    elif child.tag==W+'tbl':
        cells=[]
        for ri,row in enumerate(child.findall('w:tr',NS)):
            for ci,cell in enumerate(row.findall('w:tc',NS)):
                text=''.join(cell.xpath('.//w:t/text()',namespaces=NS))
                if text:cells.append({'row':ri,'column':ci,'text':text})
        records.append({'type':'figure','runs':[{'text':' '.join(c['text'] for c in cells),'ink':'black'}],'text':' '.join(c['text'] for c in cells),'diagram':{'kind':'lamb-parts','cells':cells},'word_paragraphs':[],'source_boxed':False})

notes=[]
for note in note_xml.findall('w:footnote',NS):
    number=int(note.get(W+'id'))
    if number<=0:continue
    text=''.join(note.xpath('.//w:t/text()',namespaces=NS)).lstrip()
    notes.append({'type':'footnote','footnote_id':number,'runs':[{'text':text,'ink':'black'}],'text':text,'word_paragraphs':[],'source_boxed':False})

role_names={'Священник':'priest','Диякон':'deacon','Вірні':'people','Читець':'reader','Хор':'choir'}
prefix=re.compile(r'^(Священник(?: виголошує)?|Диякон|Вірні|Читець|Хор|Також|Потім диякон|І знову диякон|Тоді):\s*')
def norm(s):
    s=unicodedata.normalize('NFD',s).replace('\u0301','')
    s=re.sub(r'(?<=\w)[’\x27ʼ](?=\w)','',s)
    return re.findall(r'[\w]+',s.lower())
def speech_text(s):return prefix.sub('',s)

old_tokens=[];owners=[]
for b in old['blocks']:
    if b['type']=='footnote':continue
    ts=norm(b['text']);old_tokens.extend(ts);owners.extend([b]*len(ts))
new_tokens=[];starts=[]
for b in records:
    starts.append(len(new_tokens));new_tokens.extend(norm(speech_text(b['text'])))
starts.append(len(new_tokens))
matcher=difflib.SequenceMatcher(None,old_tokens,new_tokens,autojunk=False)
matches={}
for a,b,n in matcher.get_matching_blocks():
    for k in range(n):matches[b+k]=a+k
prior_pages=[2];last_role=['deacon']
for i,b in enumerate(records):
    mapped=[owners[matches[j]] for j in range(starts[i],starts[i+1]) if j in matches]
    source_ids=list(dict.fromkeys(x['id'] for x in mapped))
    pages=sorted(set(p for x in mapped for p in x.get('source_pages',[]))) or prior_pages
    weights=collections.Counter(x['id'] for x in mapped);best=max(mapped,key=lambda x:weights[x['id']]) if mapped else None
    explicit=prefix.match(b['text'])
    if explicit:
        role=next((r for n,r in role_names.items() if explicit.group().startswith(n)),None)
        b['roles']=[role] if role else (best['roles'] if best else last_role)
        b['speaker_text']=explicit.group()
        remaining=len(explicit.group());split=[]
        for run in b['runs']:
            if remaining and len(run['text'])<=remaining:run['speaker']=True;remaining-=len(run['text']);split.append(run)
            elif remaining:
                split.extend([{**run,'text':run['text'][:remaining],'speaker':True},{**run,'text':run['text'][remaining:]}]);remaining=0
            else:split.append(run)
        b['runs']=split
    else:b['roles']=best['roles'] if best else (last_role if b['type']=='speech' else [])
    if b['type'] in ['rubric','heading','variant','figure']:b['roles']=[]
    b.update({'id':f'word-block-{i+1:04}','role_mode':best.get('role_mode','single') if best else 'single','source_pages':pages,'source_block_ids':source_ids})
    if b['roles']:last_role=b['roles']
    prior_pages=pages
for b in notes:
    original=next((x for x in old['blocks'] if x['type']=='footnote' and norm(x['text'])==norm(b['text'])),None)
    b.update({'id':f'word-note-{b["footnote_id"]}','roles':[],'role_mode':'single','source_pages':original['source_pages'] if original else [2],'source_block_ids':[original['id']] if original else []})

chapters=[]
for chapter in old['chapters']:
    match=next((b for b in records if chapter['block_id'] in b['source_block_ids']),None)
    if match is None:
        old_block=next(x for x in old['blocks'] if x['id']==chapter['block_id'])
        match=max(records,key=lambda b:difflib.SequenceMatcher(None,norm(old_block['text']),norm(speech_text(b['text']))).ratio())
    chapters.append({**chapter,'block_id':match['id']})
assert len(set(c['block_id'] for c in chapters))==len(chapters)

changes=[]
for tag,a,z,b,y in matcher.get_opcodes():
    if tag=='equal':continue
    old_text=' '.join(old_tokens[a:z]);new_text=' '.join(new_tokens[b:y])
    if not old_text and not new_text:continue
    changes.append({'kind':tag,'scan_pages':sorted(set(p for x in owners[a:z] for p in x['source_pages'])),'previous':old_text,'word':new_text})

book={**old,'source_edition':'owner_provided_word','transcription_policy':'Exact text, stresses, inline roles, emphasis, variants, diagram and footnotes imported from the owner-provided Word document. No missing appendices supplied. Scan provenance remains archived; scans are not published.','word_reference':{'filename':args.document.name,'sha256':sha,'canonical_file':'content/liturgy-word-source.json','paragraph_count':sum(len(b['word_paragraphs']) for b in records),'footnote_count':len(notes),'previous_scan_data_sha256':hashlib.sha256(old_bytes).hexdigest()},'chapters':chapters,'blocks':records+notes}
canonical={'document_sha256':sha,'title':records[0]['text'],'paragraphs':[{'word_paragraphs':b['word_paragraphs'],'text':b['text'],'runs':b['runs'],'type':b['type'],'source_boxed':b['source_boxed'],**({'diagram':b['diagram']} if 'diagram' in b else {})} for b in records],'footnotes':[{k:b[k] for k in ['footnote_id','text','runs']} for b in notes]}
for path,data in [(old_path,book),(ROOT/'content/liturgy-word-source.json',canonical)]:path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
(ROOT/'docs').mkdir(exist_ok=True)
report=['# Word edition and previous scan transcription comparison','','The owner-provided Word document is the reading and formatting authority for this update. Its exact text is imported; the previous scan edition has not been silently merged with it.','','- Word SHA-256: `'+sha+'`','- Prior scan JSON SHA-256: `'+hashlib.sha256(old_bytes).hexdigest()+'`',f'- Imported reading blocks: {len(records)}; native footnotes: {len(notes)}.',f'- Automatic token-difference candidates: {len(changes)}. Stresses and apostrophe shapes are normalized; role-label and diagram-order differences remain in this raw alignment.','','The original PDF, page images and annotated scan transcription remain in the repository/history. Production builds exclude the PDF and page images. The Word copy is retained only in the private working archive. Referenced appendices absent from the supplied document have not been reconstructed.','','## Text differences','','Each row shows the previous scan transcription and the supplied Word wording. Empty cells mean an insertion or omission in the Word edition; no wording in the Word document was changed to resolve these differences.','','| Scan pages | Previous transcription | Word document |','| --- | --- | --- |']
for c in changes:
    report.append('| '+', '.join(map(str,c['scan_pages']))+' | '+c['previous'].replace('|','\\|')+' | '+c['word'].replace('|','\\|')+' |')
(ROOT/'docs/LITURGY_WORD_COMPARISON.md').write_text('\n'.join(report)+'\n',encoding='utf8')
print(json.dumps({'blocks':len(book['blocks']),'footnotes':len(notes),'chapters':len(chapters),'text_differences':len(changes),'word_sha256':sha}))
