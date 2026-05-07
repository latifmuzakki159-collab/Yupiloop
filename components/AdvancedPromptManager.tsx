import React, { useState, useRef } from 'react';
import { PromptEntry } from '../types';

interface Props {
  prompts: PromptEntry[];
  onChange: (prompts: PromptEntry[]) => void;
}

const uuid = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

const AdvancedPromptManager: React.FC<Props> = ({ prompts, onChange }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    const newPrompt: PromptEntry = {
      id: uuid(),
      name: 'New Prompt',
      content: '',
      role: 'system',
      enabled: true,
      injectionPosition: prompts.length,
    };
    onChange([...prompts, newPrompt]);
    setExpandedId(newPrompt.id);
  };

  const handleUpdate = (id: string, field: keyof PromptEntry, value: any) => {
    onChange(prompts.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleDelete = (id: string) => {
    if(confirm('Hapus prompt ini?')) {
      onChange(prompts.filter(p => p.id !== id));
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      const newPrompts = [...prompts];
      [newPrompts[index - 1], newPrompts[index]] = [newPrompts[index], newPrompts[index - 1]];
      // Update injection positions
      newPrompts.forEach((p, i) => p.injectionPosition = i);
      onChange(newPrompts);
    } else if (direction === 'down' && index < prompts.length - 1) {
      const newPrompts = [...prompts];
      [newPrompts[index + 1], newPrompts[index]] = [newPrompts[index], newPrompts[index + 1]];
      // Update injection positions
      newPrompts.forEach((p, i) => p.injectionPosition = i);
      onChange(newPrompts);
    }
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(prompts, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "prompts_backup.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        // Basic validation
        if (Array.isArray(imported)) {
           // SillyTavern format adaptation if needed, or just direct import if it matches our schema
           const mappedPrompts = imported.map((p: any) => ({
               id: p.identifier || p.id || uuid(),
               name: p.name || 'Imported Prompt',
               content: p.content || '',
               role: p.role || 'system',
               enabled: p.enabled !== false,
               injectionPosition: p.injection_position || p.injectionPosition || 0
           }));
           onChange(mappedPrompts);
           alert('Prompts berhasil diimpor!');
        } else if (imported.prompts && Array.isArray(imported.prompts)) {
            // SillyTavern full preset format
            const mappedPrompts = imported.prompts.map((p: any) => ({
               id: p.identifier || p.id || uuid(),
               name: p.name || 'Imported Prompt',
               content: p.content || '',
               role: p.role || 'system',
               enabled: p.enabled !== false,
               injectionPosition: p.injection_position || p.injectionPosition || 0
           }));
           onChange(mappedPrompts);
           alert('Prompts berhasil diimpor!');
        } else {
            alert('Format file tidak didukung.');
        }
      } catch (err) {
        alert('Gagal membaca file JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <label className="block text-sm font-medium text-gray-300">
          Advanced Prompts (SillyTavern Style)
        </label>
        <div className="flex gap-2">
            <button onClick={() => fileInputRef.current?.click()} className="p-2 bg-gray-800 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition" title="Import Prompts">
                <i className="fas fa-file-import"></i>
            </button>
            <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json,application/json,text/plain,*/*" className="hidden" />
            
            <button onClick={handleExport} className="p-2 bg-gray-800 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition" title="Export Prompts">
                <i className="fas fa-file-export"></i>
            </button>

            <button onClick={handleAdd} className="p-2 bg-primary-600 hover:bg-primary-500 rounded text-white transition" title="Add New Prompt">
                <i className="fas fa-plus"></i>
            </button>
        </div>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
        {prompts.map((prompt, index) => (
          <div key={prompt.id} className={`border ${expandedId === prompt.id ? 'border-primary-500 bg-gray-900/80' : 'border-gray-750 bg-gray-900/30'} rounded-lg overflow-hidden transition-colors`}>
            
            {/* Header Row */}
            <div className="flex items-center p-3 gap-3">
                <div className="flex flex-col gap-1">
                    <button onClick={() => handleMove(index, 'up')} disabled={index === 0} className="text-gray-500 hover:text-white disabled:opacity-30"><i className="fas fa-chevron-up text-xs"></i></button>
                    <button onClick={() => handleMove(index, 'down')} disabled={index === prompts.length - 1} className="text-gray-500 hover:text-white disabled:opacity-30"><i className="fas fa-chevron-down text-xs"></i></button>
                </div>
                
                <div className="flex-1 cursor-pointer flex items-center gap-3" onClick={() => setExpandedId(expandedId === prompt.id ? null : prompt.id)}>
                    <i className={`fas fa-${prompt.role === 'system' ? 'cog text-gray-400' : prompt.role === 'user' ? 'user text-blue-400' : 'robot text-green-400'}`}></i>
                    <span className={`font-medium ${prompt.enabled ? 'text-gray-200' : 'text-gray-600 line-through'}`}>{prompt.name || 'Unnamed Prompt'}</span>
                </div>

                <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={prompt.enabled}
                            onChange={(e) => handleUpdate(prompt.id, 'enabled', e.target.checked)}
                        />
                        <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-500"></div>
                    </label>
                    <button onClick={() => handleDelete(prompt.id)} className="text-gray-500 hover:text-red-400 transition p-1">
                        <i className="fas fa-trash"></i>
                    </button>
                </div>
            </div>

            {/* Expanded Content */}
            {expandedId === prompt.id && (
                <div className="p-4 border-t border-gray-750 bg-gray-950/50 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs text-gray-400">Name</label>
                            <input 
                                type="text" 
                                value={prompt.name} 
                                onChange={(e) => handleUpdate(prompt.id, 'name', e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white outline-none focus:border-primary-500"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-gray-400">Role</label>
                            <select 
                                value={prompt.role}
                                onChange={(e) => handleUpdate(prompt.id, 'role', e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white outline-none focus:border-primary-500"
                            >
                                <option value="system">System</option>
                                <option value="user">User</option>
                                <option value="assistant">Assistant</option>
                            </select>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-gray-400">Content (Supports {`{{char}}`}, {`{{user}}`})</label>
                        <textarea 
                            value={prompt.content}
                            onChange={(e) => handleUpdate(prompt.id, 'content', e.target.value)}
                            rows={6}
                            className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-gray-300 font-mono outline-none focus:border-primary-500 resize-y"
                        />
                    </div>
                </div>
            )}
          </div>
        ))}
        {prompts.length === 0 && (
            <div className="text-center p-8 border border-dashed border-gray-750 rounded-xl text-gray-500">
                Belum ada prompt. Klik tombol + untuk menambahkan.
            </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedPromptManager;
