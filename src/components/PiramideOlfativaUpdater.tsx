import React, { useState } from 'react';
import { Plus, X, Copy, Check, FileText } from 'lucide-react';

interface Note {
  name: string;
  imageUrl: string;
}

interface PyramidData {
  top: Note[];
  heart: Note[];
  base: Note[];
}

const PiramideOlfativaUpdater: React.FC = () => {
  const [htmlInput, setHtmlInput] = useState('');
  const [pyramid, setPyramid] = useState<PyramidData>({
    top: [],
    heart: [],
    base: []
  });
  const [originalHtml, setOriginalHtml] = useState('');
  const [pyramidLoaded, setPyramidLoaded] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState('');
  const [copied, setCopied] = useState(false);

  const normalizeNoteName = (name: string): string => {
    const accentsMap: { [key: string]: string } = {
      'á': 'a', 'à': 'a', 'ã': 'a', 'â': 'a', 'ä': 'a',
      'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
      'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
      'ó': 'o', 'ò': 'o', 'õ': 'o', 'ô': 'o', 'ö': 'o',
      'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u',
      'ç': 'c', 'ñ': 'n'
    };

    return name
      .toLowerCase()
      .split('')
      .map(char => accentsMap[char] || char)
      .join('')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  };

  const extractPyramid = (html: string): PyramidData => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const section = doc.querySelector('#section-piramide-olfativa');
    
    if (!section) {
      return { top: [], heart: [], base: [] };
    }

    const extractNotes = (headerText: string): Note[] => {
      const headers = Array.from(section.querySelectorAll('h3'));
      const header = headers.find(h => h.textContent?.includes(headerText));
      
      if (!header) return [];

      const table = header.nextElementSibling;
      if (!table) return [];

      const cells = Array.from(table.querySelectorAll('td'));
      return cells.map(cell => {
        const img = cell.querySelector('img');
        const span = cell.querySelector('span');
        return {
          name: span?.textContent?.trim() || '',
          imageUrl: img?.getAttribute('src') || ''
        };
      }).filter(note => note.name);
    };

    return {
      top: extractNotes('Notas de Topo'),
      heart: extractNotes('Notas de Coração'),
      base: extractNotes('Notas de Base')
    };
  };

  // Carregar HTML
  const loadHtml = () => {
    if (!htmlInput.trim()) {
      alert('Por favor, cole o código HTML');
      return;
    }

    setOriginalHtml(htmlInput);
    setPyramid(extractPyramid(htmlInput));
    setPyramidLoaded(true);
    setGeneratedHtml('');
  };

  const generatePyramidHTML = (): string => {
    const generateNoteHTML = (note: Note) => `
			<td style="text-align:center; padding:0 8px;"><img alt="${note.name}" src="${note.imageUrl}" style="height:70px;" /><br />
			<span style="font-size:14px;">${note.name}</span></td>`;

    const generateSectionHTML = (title: string, notes: Note[]) => `
<div style="text-align:center; margin-bottom:32px;">
<h3 style="margin:0 0 8px 0;">${title}</h3>

<table style="margin:0 auto; border-collapse:collapse;">
	<tbody>
		<tr>
			${notes.map(note => generateNoteHTML(note)).join('\n\t\t\t')}
		</tr>
	</tbody>
</table>
</div>`;

    return `<section id="section-piramide-olfativa">
${generateSectionHTML('Notas de Topo', pyramid.top)}
${generateSectionHTML('Notas de Coração', pyramid.heart)}
${generateSectionHTML('Notas de Base', pyramid.base)}
</section>`;
  };

  // Gerar HTML completo atualizado
  const generateUpdatedHtml = () => {
    const newPyramidHTML = generatePyramidHTML();

    // Regex mais flexível: aceita outros atributos, aspas simples/dobras, etc.
    const regex = /<section[^>]*id=["']section-piramide-olfativa["'][^>]*>[\s\S]*?<\/section>/i;

    // Se achar a section, substitui; senão, só anexa no final (opcional)
    const updated = regex.test(originalHtml)
      ? originalHtml.replace(regex, newPyramidHTML)
      : `${originalHtml}\n${newPyramidHTML}`;

    setGeneratedHtml(updated);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedHtml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addNote = (level: keyof PyramidData) => {
    setPyramid(prev => ({
      ...prev,
      [level]: [...prev[level], { name: '', imageUrl: '' }]
    }));
  };

  const removeNote = (level: keyof PyramidData, index: number) => {
    setPyramid(prev => ({
      ...prev,
      [level]: prev[level].filter((_, i) => i !== index)
    }));
  };

  const updateNote = (level: keyof PyramidData, index: number, field: 'name' | 'imageUrl', value: string) => {
    setPyramid(prev => ({
      ...prev,
      [level]: prev[level].map((note, i) => {
        if (i === index) {
          if (field === 'name') {
            const normalizedName = normalizeNoteName(value);
            return {
              name: value,
              imageUrl: `https://topparfum.s3.us-east-1.amazonaws.com/notas/${normalizedName}.webp`
            };
          }
          return { ...note, [field]: value };
        }
        return note;
      })
    }));
  };

  const renderNoteSection = (title: string, level: keyof PyramidData, color: string) => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-semibold ${color}`}>{title}</h3>
        <button
          onClick={() => addNote(level)}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm"
        >
          <Plus size={16} />
          Adicionar
        </button>
      </div>
      
      <div className="space-y-3">
        {pyramid[level].map((note, index) => (
          <div key={index} className="flex gap-3 items-start bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Nome da nota (ex: Lavanda)"
                value={note.name}
                onChange={(e) => updateNote(level, index, 'name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <input
                type="text"
                placeholder="URL da imagem (gerado automaticamente)"
                value={note.imageUrl}
                onChange={(e) => updateNote(level, index, 'imageUrl', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {note.imageUrl && (
              <img 
                src={note.imageUrl} 
                alt={note.name}
                className="w-12 h-12 object-cover rounded border border-gray-200"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
            <button
              onClick={() => removeNote(level, index)}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
              title="Remover nota"
            >
              <X size={20} />
            </button>
          </div>
        ))}
        
        {pyramid[level].length === 0 && (
          <p className="text-gray-400 text-center py-4 text-sm">Nenhuma nota adicionada</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              🌸 Editor de Pirâmide Olfativa
            </h1>
            <p className="text-gray-600">
              Cole o HTML, edite as notas e gere o código atualizado
            </p>
          </div>

          {!pyramidLoaded ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cole o código HTML completo da descrição:
                </label>
                <textarea
                  value={htmlInput}
                  onChange={(e) => setHtmlInput(e.target.value)}
                  placeholder="Cole aqui o HTML completo da descrição do produto..."
                  className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                />
              </div>
              <button
                onClick={loadHtml}
                className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-semibold flex items-center justify-center gap-2"
              >
                <FileText size={20} />
                Carregar e Editar Pirâmide
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Coluna Esquerda - Editor */}
              <div>
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-800">Editor de Notas</h2>
                  <button
                    onClick={() => {
                      setPyramidLoaded(false);
                      setHtmlInput('');
                      setGeneratedHtml('');
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    ← Voltar
                  </button>
                </div>
                
                {renderNoteSection('🍋 Notas de Topo', 'top', 'text-yellow-600')}
                {renderNoteSection('🌺 Notas de Coração', 'heart', 'text-pink-600')}
                {renderNoteSection('🌲 Notas de Base', 'base', 'text-amber-700')}

                <button
                  onClick={generateUpdatedHtml}
                  className="w-full mt-6 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-semibold flex items-center justify-center gap-2"
                >
                  <FileText size={20} />
                  Gerar HTML Atualizado
                </button>
              </div>

              {/* Coluna Direita - Preview e Output */}
              <div>
                <div className="sticky top-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">Preview da Pirâmide</h2>
                  
                  {/* Preview visual */}
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-6 mb-6 border border-gray-200">
                    {[
                      { title: 'Notas de Topo', notes: pyramid.top },
                      { title: 'Notas de Coração', notes: pyramid.heart },
                      { title: 'Notas de Base', notes: pyramid.base }
                    ].map((section, idx) => (
                      <div key={idx} className="mb-6 last:mb-0">
                        <h3 className="text-center font-semibold text-gray-700 mb-3 text-sm">
                          {section.title}
                        </h3>
                        <div className="flex flex-wrap justify-center gap-4">
                          {section.notes.map((note, noteIdx) => (
                            <div key={noteIdx} className="flex flex-col items-center">
                              {note.imageUrl ? (
                                <img
                                  src={note.imageUrl}
                                  alt={note.name}
                                  className="w-16 h-16 object-cover rounded-lg shadow-sm border border-gray-200"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect fill="%23ddd"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-size="12"%3E?%3C/text%3E%3C/svg%3E';
                                  }}
                                />
                              ) : (
                                <div className="w-16 h-16 rounded-lg shadow-sm border border-gray-300 bg-gray-200 flex items-center justify-center">
                                  <span className="text-gray-400 text-xs">?</span>
                                </div>
                              )}
                              <span className="text-xs text-gray-600 mt-1 text-center max-w-[80px]">
                                {note.name || 'Sem nome'}
                              </span>
                            </div>
                          ))}
                          {section.notes.length === 0 && (
                            <span className="text-gray-400 text-xs">Nenhuma nota</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* HTML Gerado */}
                  {generatedHtml && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-700">HTML Atualizado</h3>
                        <button
                          onClick={copyToClipboard}
                          className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition text-sm"
                        >
                          {copied ? (
                            <>
                              <Check size={16} />
                              Copiado!
                            </>
                          ) : (
                            <>
                              <Copy size={16} />
                              Copiar
                            </>
                          )}
                        </button>
                      </div>
                      <textarea
                        value={generatedHtml}
                        readOnly
                        className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg font-mono text-xs bg-gray-50"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dica de uso */}
        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2 text-sm">💡 Como usar:</h3>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>1. Cole o HTML completo da descrição do produto</li>
            <li>2. A pirâmide atual será extraída automaticamente</li>
            <li>3. Adicione, edite ou remova notas</li>
            <li>4. Clique em "Gerar HTML Atualizado"</li>
            <li>5. Copie o HTML gerado e use no seu sistema</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PiramideOlfativaUpdater;