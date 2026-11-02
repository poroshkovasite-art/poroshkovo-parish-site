import {esc} from './components.mjs';

function renderRuns(block){
 return block.runs.map(run=>{
  if(run.footnote_ref){const n=run.footnote_ref;return `<sup class="book-note-ref"><a id="note-ref-${n}" href="#liturgy-note-${n}" aria-label="Примітка ${n}">${n}</a></sup>`;}
  const classes=[`ink-${run.ink}`,run.speaker?'book-speaker':'',run.bold?'word-bold':'',run.italic?'word-italic':''].filter(Boolean).join(' ');
  return `<span class="${classes}">${esc(run.text)}</span>`;
 }).join('');
}

function renderDiagram(block){
 const cells=block.diagram.cells;
 const label='Розміщення частин святого Агнця: ІС вгорі, ХС внизу, НІ ліворуч, КА праворуч. '+cells.find(c=>c.row===1&&c.column===1).text;
 return `<figure class="book-diagram" role="img" aria-label="${esc(label)}"><div class="lamb-parts" aria-hidden="true">${cells.map(c=>`<span class="lamb-cell lamb-position-${c.row}-${c.column}${c.row===1&&c.column===1?' lamb-instruction':''}">${esc(c.text)}</span>`).join('')}</div></figure>`;
}

export function renderLiturgy(book,language){
 if(book.schema_version!==2||!book.rights_confirmed||!book.pastor_approval_confirmed||!book.word_reference)throw Error('An authorized owner-provided Word edition is required');
 const css='<link rel="stylesheet" href="/assets/liturgy-book.css">';
 if(language==='en')return css+`<section class="section wrap liturgy-language" data-liturgy-language-link><h1>Divine Liturgy</h1><p>The Divine Liturgy of Saint John Chrysostom is available in Ukrainian.</p><a class="button" href="/uk/divine-liturgy/" lang="en">Read in Ukrainian ↗</a></section>`;
 const first=book.blocks[0],notes=book.blocks.filter(b=>b.type==='footnote');
 const chapters=new Map(book.chapters.map(c=>[c.block_id,c]));
 const titleKey=s=>s.toLocaleLowerCase('uk').replace(/[^\p{L}\p{N}]/gu,'');
 const body=book.blocks.filter(b=>b!==first&&b.type!=='footnote').map(block=>{
  const chapter=chapters.get(block.id);
  const anchor=chapter?`<span class="book-anchor" id="liturgy-${esc(chapter.id)}"></span>`:'';
  const chapterTitle=chapter&&titleKey(chapter.title.uk)!==titleKey(block.text)?`<h2 class="book-chapter-title">${esc(chapter.title.uk)}</h2>`:'';
  const tag=block.type==='heading'?'h2':block.type==='variant'?'h3':'p';
  const role=block.roles.includes('people')?'people':block.roles[0];
  return anchor+chapterTitle+`<div class="book-block book-${block.type}${block.source_boxed?' source-boxed':''}" id="${esc(block.id)}" data-word-block="${esc(block.id)}"${role?` data-role="${esc(role)}"`:''}>${block.type==='figure'?renderDiagram(block):`<${tag} class="book-text">${renderRuns(block)}</${tag}>`}</div>`;
 }).join('');
 return css+`<section class="section wrap liturgy-library" data-liturgy-reader id="liturgy-reader-top">
 <header class="liturgy-title book-block book-heading" id="${esc(first.id)}" data-word-block="${esc(first.id)}"><span class="book-anchor" id="liturgy-opening"></span><h1 class="book-text">${renderRuns(first)}</h1></header>
 <div class="reader-toolbar" role="group" aria-label="Налаштування читання"><button type="button" data-reader-size="down" aria-label="Зменшити шрифт">A−</button><button type="button" data-reader-size="up" aria-label="Збільшити шрифт">A+</button><button type="button" data-reader-mode aria-pressed="false">Режим читання</button><button type="button" data-reader-print>Друк</button><a href="#liturgy-contents">До змісту</a><span role="status" aria-live="polite" data-reader-status></span></div>
 <div class="liturgy-layout"><nav class="liturgy-toc" id="liturgy-contents" aria-label="Зміст Літургії"><details data-reader-contents><summary>Зміст Літургії</summary><div class="liturgy-toc-links">${book.chapters.map(c=>`<a href="#liturgy-${esc(c.id)}">${esc(c.title.uk)}</a>`).join('')}<a href="#liturgy-notes">Примітки</a></div></details></nav>
 <div class="liturgy-book"><article class="liturgy-part" lang="uk" aria-label="Богослужбовий текст">${body}</article>
 <section class="book-notes" id="liturgy-notes" aria-labelledby="liturgy-notes-title"><h2 id="liturgy-notes-title">Примітки</h2><ol>${notes.map(b=>`<li class="book-block book-footnote" id="liturgy-note-${b.footnote_id}" data-word-block="${esc(b.id)}" value="${b.footnote_id}"><p class="book-text">${renderRuns(b)} <a class="note-return" href="#note-ref-${b.footnote_id}" aria-label="Повернутися до тексту примітки ${b.footnote_id}">↩</a></p></li>`).join('')}</ol></section>
 <a class="book-back-top" href="#liturgy-reader-top">На початок ↑</a></div></div></section><script src="/assets/liturgy-reader.js" defer></script>`;
}
