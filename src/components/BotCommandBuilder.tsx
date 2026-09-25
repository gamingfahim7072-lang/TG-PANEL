import React, { useState } from 'react';
import {
  Terminal,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Copy,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Search,
  ExternalLink,
  Layers,
  ShoppingBag,
  FolderTree,
  CreditCard,
  History,
  HelpCircle,
  MessageSquare,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import {
  BotCommand,
  CommandActionType,
  CommandTriggerType,
  BotMenu,
  Product,
  ProductCategory
} from '../types';
import { api } from '../api';

interface BotCommandBuilderProps {
  botId: string;
  botUsername?: string;
  commands: BotCommand[];
  menus: BotMenu[];
  products: Product[];
  categories: ProductCategory[];
  onCommandsChange: (newCommands: BotCommand[]) => void;
  onPreviewCommand?: (command: BotCommand) => void;
}

const ACTION_DEFINITIONS: Array<{
  type: CommandActionType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  needsTarget: 'MENU' | 'SUBMENU' | 'CATEGORY' | 'PRODUCT' | 'NONE';
  defaultNextStep?: string;
}> = [
  {
    type: 'OPEN_MENU',
    label: 'Open Main Menu',
    description: 'Displays the primary navigation screen and inline keyboard',
    icon: FolderTree,
    needsTarget: 'MENU',
    defaultNextStep: 'SHOW_CATEGORIES'
  },
  {
    type: 'OPEN_SUBMENU',
    label: 'Open Submenu',
    description: 'Navigates directly to a nested submenu screen',
    icon: Layers,
    needsTarget: 'SUBMENU',
    defaultNextStep: 'SHOW_CATEGORIES'
  },
  {
    type: 'SHOW_PRODUCTS',
    label: 'Browse Products Catalog',
    description: 'Lists all available digital products and stock',
    icon: ShoppingBag,
    needsTarget: 'NONE',
    defaultNextStep: 'SELECT_PACKAGE'
  },
  {
    type: 'OPEN_CATEGORY',
    label: 'Filter by Category',
    description: 'Displays products under a specific store category',
    icon: FolderTree,
    needsTarget: 'CATEGORY',
    defaultNextStep: 'SELECT_PACKAGE'
  },
  {
    type: 'OPEN_PRODUCT',
    label: 'Open Product Details',
    description: 'Presents pricing, descriptions, and purchase buttons',
    icon: ShoppingBag,
    needsTarget: 'PRODUCT',
    defaultNextStep: 'SELECT_PACKAGE'
  },
  {
    type: 'PAYMENT_METHODS',
    label: 'Payment QR & Gateways',
    description: 'Displays merchant UPI QR, instructions, and bank info',
    icon: CreditCard,
    needsTarget: 'NONE',
    defaultNextStep: 'SHOW_QR'
  },
  {
    type: 'MY_ORDERS',
    label: 'Order History & Licenses',
    description: 'Customer past orders, license keys, and download links',
    icon: History,
    needsTarget: 'NONE',
    defaultNextStep: 'MY_ORDERS'
  },
  {
    type: 'MY_ACCOUNT',
    label: 'Customer Account & Balance',
    description: 'Customer profile details, wallet balance, and top-up',
    icon: Sparkles,
    needsTarget: 'NONE',
    defaultNextStep: 'PAYMENT_METHODS'
  },
  {
    type: 'SUPPORT',
    label: 'Support Desk',
    description: 'Connects customer with support team or support URL',
    icon: MessageSquare,
    needsTarget: 'NONE',
    defaultNextStep: 'SUPPORT'
  },
  {
    type: 'FAQ',
    label: 'FAQ Knowledge Base',
    description: 'Interactive FAQ questions and answers catalog',
    icon: HelpCircle,
    needsTarget: 'NONE',
    defaultNextStep: 'FAQ'
  },
  {
    type: 'CUSTOM_MESSAGE',
    label: 'Custom Response Message',
    description: 'Sends custom formatted markdown text with main buttons',
    icon: MessageSquare,
    needsTarget: 'NONE',
    defaultNextStep: 'OPEN_MENU'
  }
];

const PRESET_COMMAND_SUGGESTIONS = [
  { cmd: '/start', desc: 'Main Menu & Catalog', action: 'OPEN_MENU' as CommandActionType },
  { cmd: '/products', desc: 'Browse store catalog and instant licenses', action: 'SHOW_PRODUCTS' as CommandActionType },
  { cmd: '/orders', desc: 'View delivered license keys & downloads', action: 'MY_ORDERS' as CommandActionType },
  { cmd: '/balance', desc: 'Check wallet balance & account info', action: 'MY_ACCOUNT' as CommandActionType },
  { cmd: '/payment', desc: 'Scan merchant UPI QR and bank transfer', action: 'PAYMENT_METHODS' as CommandActionType },
  { cmd: '/support', desc: 'Contact human support desk', action: 'SUPPORT' as CommandActionType },
  { cmd: '/faq', desc: 'Frequently asked questions & guides', action: 'FAQ' as CommandActionType }
];

export const BotCommandBuilder: React.FC<BotCommandBuilderProps> = ({
  botId,
  botUsername,
  commands,
  menus,
  products,
  categories,
  onCommandsChange,
  onPreviewCommand
}) => {
  const [search, setSearch] = useState('');
  const [editingCommand, setEditingCommand] = useState<Partial<BotCommand> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [savingCommand, setSavingCommand] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Normalization & Validation Helper
  const validateCommandInput = (input: string, currentId?: string): { valid: boolean; normalized: string; error?: string } => {
    let clean = input.trim().toLowerCase();
    if (!clean.startsWith('/')) {
      clean = '/' + clean;
    }
    // Remove unwanted characters
    clean = clean.replace(/[^a-z0-9_/]/g, '');

    const pattern = /^\/[a-z0-9_]{1,32}$/;
    if (!pattern.test(clean)) {
      return {
        valid: false,
        normalized: clean,
        error: 'Must be / followed by 1 to 32 lowercase letters, numbers, or underscores.'
      };
    }

    const isDuplicate = commands.some(
      c => c.id !== currentId && c.command.toLowerCase() === clean.toLowerCase()
    );
    if (isDuplicate) {
      return {
        valid: false,
        normalized: clean,
        error: `Command '${clean}' already exists in this bot.`
      };
    }

    return { valid: true, normalized: clean };
  };

  const handleOpenAddModal = (preset?: typeof PRESET_COMMAND_SUGGESTIONS[0]) => {
    setModalError(null);
    if (preset) {
      const targetName = preset.action === 'OPEN_MENU' ? 'Main Menu' : preset.desc;
      setEditingCommand({
        command: preset.cmd,
        description: preset.desc,
        trigger_type: 'TELEGRAM_COMMAND',
        action_type: preset.action,
        target_id: preset.action === 'OPEN_MENU' ? 'main' : undefined,
        target_name: targetName,
        next_step: preset.action === 'SHOW_PRODUCTS' ? 'SELECT_PACKAGE' : 'SHOW_CATEGORIES',
        is_enabled: true
      });
    } else {
      setEditingCommand({
        command: '/',
        description: '',
        trigger_type: 'TELEGRAM_COMMAND',
        action_type: 'OPEN_MENU',
        target_id: 'main',
        target_name: 'Main Menu',
        next_step: 'SHOW_CATEGORIES',
        is_enabled: true
      });
    }
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cmd: BotCommand) => {
    setModalError(null);
    setEditingCommand({ ...cmd });
    setIsModalOpen(true);
  };

  const handleSaveModal = async () => {
    if (!editingCommand) return;
    setModalError(null);

    const validation = validateCommandInput(editingCommand.command || '', editingCommand.id);
    if (!validation.valid) {
      setModalError(validation.error || 'Invalid command format.');
      return;
    }

    const cleanDesc = (editingCommand.description || '').trim();
    if (!cleanDesc) {
      setModalError('Description is required (1-256 characters) for Telegram menu autocomplete.');
      return;
    }
    if (cleanDesc.length > 256) {
      setModalError('Description exceeds 256 characters allowed by Telegram.');
      return;
    }

    setSavingCommand(true);
    try {
      // Determine target_name automatically
      let targetName = editingCommand.target_name;
      if (editingCommand.action_type === 'OPEN_MENU' || editingCommand.action_type === 'OPEN_SUBMENU') {
        const foundMenu = menus.find(m => m.id === editingCommand.target_id || m.slug === editingCommand.target_id);
        targetName = foundMenu ? foundMenu.title : 'Main Menu';
      } else if (editingCommand.action_type === 'OPEN_CATEGORY') {
        const foundCat = categories.find(c => c.id === editingCommand.target_id);
        targetName = foundCat ? foundCat.name : 'Category';
      } else if (editingCommand.action_type === 'OPEN_PRODUCT') {
        const foundProd = products.find(p => p.id === editingCommand.target_id);
        targetName = foundProd ? foundProd.name : 'Product';
      }

      const payload: Partial<BotCommand> = {
        ...editingCommand,
        command: validation.normalized,
        description: cleanDesc,
        target_name: targetName
      };

      if (editingCommand.id) {
        // Update existing command
        const res = await api.updateBotCommand(botId, editingCommand.id, payload);
        const updated = commands.map(c => (c.id === editingCommand.id ? res.command : c));
        onCommandsChange(updated);
        setActionSuccess(`Command ${res.command.command} updated successfully!`);
      } else {
        // Create new command
        const res = await api.createBotCommand(botId, payload);
        onCommandsChange([...commands, res.command]);
        setActionSuccess(`Command ${res.command.command} created successfully!`);
      }

      setIsModalOpen(false);
      setEditingCommand(null);
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      setModalError(err.message || 'Failed to save command.');
    } finally {
      setSavingCommand(false);
    }
  };

  const handleToggleCommand = async (cmdId: string) => {
    try {
      const res = await api.toggleBotCommand(botId, cmdId);
      const updated = commands.map(c => (c.id === cmdId ? { ...c, is_enabled: res.is_enabled } : c));
      onCommandsChange(updated);
      setActionSuccess(res.message);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to toggle command');
    }
  };

  const handleDeleteCommand = async (cmdId: string, cmdName: string) => {
    if (!confirm(`Are you sure you want to delete command "${cmdName}"? It will no longer respond on Telegram.`)) {
      return;
    }
    try {
      await api.deleteBotCommand(botId, cmdId);
      const updated = commands.filter(c => c.id !== cmdId);
      onCommandsChange(updated);
      setActionSuccess(`Command ${cmdName} deleted.`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to delete command');
    }
  };

  const handleDuplicateCommand = async (cmdId: string) => {
    try {
      const res = await api.duplicateBotCommand(botId, cmdId);
      onCommandsChange([...commands, res.command]);
      setActionSuccess(`Duplicated command to ${res.command.command}`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to duplicate command');
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= commands.length) return;

    const newArr = [...commands];
    const [moved] = newArr.splice(index, 1);
    newArr.splice(targetIndex, 0, moved);

    const reordered = newArr.map((c, idx) => ({ ...c, sort_order: idx }));
    onCommandsChange(reordered);

    try {
      await api.reorderBotCommands(botId, reordered.map(c => c.id));
    } catch (err: any) {
      console.error('Failed to persist order:', err);
    }
  };

  const filteredCommands = commands.filter(c => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.command.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.action_type.toLowerCase().includes(q) ||
      (c.target_name && c.target_name.toLowerCase().includes(q))
    );
  });

  const activeCount = commands.filter(c => c.is_enabled).length;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Top Header & Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-bold text-white flex items-center space-x-2">
                <span>Telegram Command Builder</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono">
                  {activeCount} Active / {commands.length} Total
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Map Telegram slash commands (like <code className="text-cyan-300 font-mono">/start</code>, <code className="text-cyan-300 font-mono">/products</code>) to bot menus, actions, or catalogs.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => handleOpenAddModal()}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition-all shadow-md shadow-cyan-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Create Command</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2 font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Preset Suggestions Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>Quick Preset Shortcuts</span>
          <span className="text-[10px] text-slate-500 font-normal">Click to prefill & add</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESET_COMMAND_SUGGESTIONS.map(preset => {
            const exists = commands.some(c => c.command.toLowerCase() === preset.cmd.toLowerCase());
            return (
              <button
                key={preset.cmd}
                type="button"
                onClick={() => !exists && handleOpenAddModal(preset)}
                disabled={exists}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all border flex items-center space-x-1.5 ${
                  exists
                    ? 'bg-slate-800/40 text-slate-500 border-slate-800 cursor-not-allowed'
                    : 'bg-slate-800/80 hover:bg-cyan-950/40 text-cyan-300 hover:text-cyan-200 border-slate-700 hover:border-cyan-500/40'
                }`}
              >
                <span>{preset.cmd}</span>
                {exists ? (
                  <span className="text-[10px] text-slate-600 font-sans">✓ added</span>
                ) : (
                  <Plus className="w-3 h-3 text-cyan-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search commands by name, description, or action..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
        <div className="text-xs text-slate-400 flex items-center space-x-2">
          <span>Sort order is synchronized with Telegram's popup menu.</span>
        </div>
      </div>

      {/* Commands List Table / Cards */}
      <div className="space-y-2.5">
        {filteredCommands.length === 0 ? (
          <div className="p-10 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30">
            <Terminal className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <div className="text-sm font-bold text-slate-300">No commands found</div>
            <p className="text-xs text-slate-500 mt-1">
              {search ? 'No commands match your search query.' : 'Click "Create Command" or choose a preset above.'}
            </p>
          </div>
        ) : (
          filteredCommands.map((cmd, idx) => {
            const actionDef = ACTION_DEFINITIONS.find(a => a.type === cmd.action_type) || ACTION_DEFINITIONS[0];
            const Icon = actionDef.icon;

            return (
              <div
                key={cmd.id}
                className={`p-3.5 bg-slate-900/90 border rounded-xl transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                  cmd.is_enabled
                    ? 'border-slate-800 hover:border-slate-700'
                    : 'border-slate-800/60 opacity-65 bg-slate-950/40'
                }`}
              >
                {/* Left: Reorder & Command Title */}
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="flex flex-col space-y-1">
                    <button
                      type="button"
                      onClick={() => handleMove(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed"
                      title="Move Up"
                    >
                      <MoveUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(idx, 'down')}
                      disabled={idx === filteredCommands.length - 1}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed"
                      title="Move Down"
                    >
                      <MoveDown className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-800 text-cyan-400 border border-slate-700/80 shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-black text-cyan-300">
                        {cmd.command}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {actionDef.label}
                      </span>
                      {cmd.target_name && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-cyan-950/70 text-cyan-300 border border-cyan-800/60 flex items-center space-x-1">
                          <span>Target:</span>
                          <span className="font-bold">{cmd.target_name}</span>
                        </span>
                      )}
                      {cmd.next_step && (
                        <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-slate-800/80 text-slate-400">
                          Next: {cmd.next_step}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-1 truncate">
                      {cmd.description}
                    </div>
                  </div>
                </div>

                {/* Right: Actions & Toggle */}
                <div className="flex items-center space-x-2 shrink-0 self-end md:self-center">
                  {onPreviewCommand && (
                    <button
                      type="button"
                      onClick={() => onPreviewCommand(cmd)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center space-x-1 border border-slate-700 transition-colors"
                      title="Test in Mockup"
                    >
                      <span>Test</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleToggleCommand(cmd.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center space-x-1.5 ${
                      cmd.is_enabled
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                    }`}
                    title={cmd.is_enabled ? 'Disable command' : 'Enable command'}
                  >
                    {cmd.is_enabled ? (
                      <>
                        <ToggleRight className="w-4 h-4 text-emerald-400" />
                        <span>Active</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-4 h-4 text-slate-400" />
                        <span>Disabled</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDuplicateCommand(cmd.id)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700"
                    title="Duplicate Command"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(cmd)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-900/40 text-cyan-400 border border-slate-700"
                    title="Edit Command Configuration"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteCommand(cmd.id, cmd.command)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-700"
                    title="Delete Command"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Telegram Native Command Menu Preview Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Telegram Native Command Menu Preview
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            bot: {botUsername ? `@${botUsername}` : 'your_bot'}
          </span>
        </div>
        <p className="text-xs text-slate-400">
          When users type <code className="text-cyan-300 font-mono">/</code> in Telegram, they will see this autocomplete menu list in real-time:
        </p>

        <div className="bg-[#182234] border border-slate-700/80 rounded-xl p-2 max-w-lg space-y-1 font-sans shadow-lg">
          {commands.filter(c => c.is_enabled).length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-500">No active commands enabled for menu display.</div>
          ) : (
            commands
              .filter(c => c.is_enabled)
              .map(c => (
                <div
                  key={c.id}
                  className="px-3 py-2 rounded-lg hover:bg-slate-800/80 transition-colors flex items-center justify-between cursor-default"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <span className="font-mono text-xs font-bold text-cyan-400">{c.command}</span>
                    <span className="text-xs text-slate-300 truncate">{c.description}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-2">
                    {c.action_type.replace('_', ' ')}
                  </span>
                </div>
              ))
          )}
        </div>
      </div>

      {/* Add / Edit Command Modal */}
      {isModalOpen && editingCommand && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                  <Terminal className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white">
                  {editingCommand.id ? `Edit Command: ${editingCommand.command}` : 'Create New Telegram Command'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingCommand(null);
                }}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Command Slash Trigger */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Telegram Command Trigger <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={editingCommand.command || ''}
                    onChange={e => {
                      let val = e.target.value.toLowerCase().replace(/[^a-z0-9_/]/g, '');
                      if (!val.startsWith('/')) val = '/' + val;
                      setEditingCommand({ ...editingCommand, command: val.slice(0, 33) });
                    }}
                    placeholder="/products"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono font-bold focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Must start with <code className="text-cyan-400 font-mono">/</code>, 1-32 lowercase characters, numbers, and underscores (e.g. <code className="text-cyan-400 font-mono">/start</code>, <code className="text-cyan-400 font-mono">/vip_pass</code>).
                </p>
              </div>

              {/* Description */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-300">
                    Description <span className="text-red-400">*</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {(editingCommand.description || '').length} / 256
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={256}
                  value={editingCommand.description || ''}
                  onChange={e => setEditingCommand({ ...editingCommand, description: e.target.value })}
                  placeholder="Browse digital store products and instant licenses"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Shown to users in Telegram's autocomplete menu list.
                </p>
              </div>

              {/* Action Type */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Target Flow Action <span className="text-red-400">*</span>
                </label>
                <select
                  value={editingCommand.action_type || 'OPEN_MENU'}
                  onChange={e => {
                    const nextAction = e.target.value as CommandActionType;
                    const def = ACTION_DEFINITIONS.find(a => a.type === nextAction);
                    setEditingCommand({
                      ...editingCommand,
                      action_type: nextAction,
                      next_step: def?.defaultNextStep || editingCommand.next_step,
                      target_id: nextAction === 'OPEN_MENU' ? 'main' : undefined
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-medium focus:outline-none focus:border-cyan-500"
                >
                  {ACTION_DEFINITIONS.map(act => (
                    <option key={act.type} value={act.type}>
                      {act.label} — {act.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Target Picker based on Action Type */}
              {(editingCommand.action_type === 'OPEN_MENU' || editingCommand.action_type === 'OPEN_SUBMENU') && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Select Target Menu Screen
                  </label>
                  <select
                    value={editingCommand.target_id || 'main'}
                    onChange={e => {
                      const selected = menus.find(m => m.id === e.target.value);
                      setEditingCommand({
                        ...editingCommand,
                        target_id: e.target.value,
                        target_name: selected?.title || 'Menu'
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    {menus.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.title} ({m.slug === 'main' ? 'Main Menu' : `Submenu #${m.slug}`})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {editingCommand.action_type === 'OPEN_CATEGORY' && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Select Target Product Category
                  </label>
                  {categories.length === 0 ? (
                    <div className="text-xs text-amber-400 p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                      No categories created yet. Please create a category first.
                    </div>
                  ) : (
                    <select
                      value={editingCommand.target_id || ''}
                      onChange={e => {
                        const cat = categories.find(c => c.id === e.target.value);
                        setEditingCommand({
                          ...editingCommand,
                          target_id: e.target.value,
                          target_name: cat?.name || 'Category'
                        });
                      }}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="">Select a category...</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {editingCommand.action_type === 'OPEN_PRODUCT' && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Select Target Product
                  </label>
                  {products.length === 0 ? (
                    <div className="text-xs text-amber-400 p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                      No products created yet. Please create a product first.
                    </div>
                  ) : (
                    <select
                      value={editingCommand.target_id || ''}
                      onChange={e => {
                        const prod = products.find(p => p.id === e.target.value);
                        setEditingCommand({
                          ...editingCommand,
                          target_id: e.target.value,
                          target_name: prod?.name || 'Product'
                        });
                      }}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="">Select a product...</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.currency} {p.price})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Next Step / Flow Node Connection */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Next Step Flow Node
                </label>
                <select
                  value={editingCommand.next_step || 'SHOW_CATEGORIES'}
                  onChange={e => setEditingCommand({ ...editingCommand, next_step: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="SHOW_CATEGORIES">SHOW_CATEGORIES (Browse category levels)</option>
                  <option value="SELECT_PACKAGE">SELECT_PACKAGE (Choose package duration)</option>
                  <option value="PROCEED_PAYMENT">PROCEED_PAYMENT (Generate payment QR)</option>
                  <option value="SHOW_QR">SHOW_QR (Display payment instructions)</option>
                  <option value="MY_ORDERS">MY_ORDERS (View order history)</option>
                  <option value="SUPPORT">SUPPORT (Live support contact)</option>
                  <option value="FAQ">FAQ (Question answers)</option>
                </select>
              </div>

              {/* Optional Custom Response Message */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Custom Response Message (Optional)
                </label>
                <textarea
                  rows={2}
                  value={editingCommand.custom_response_message || ''}
                  onChange={e => setEditingCommand({ ...editingCommand, custom_response_message: e.target.value })}
                  placeholder="Hello {name}, welcome to our store! Your balance is {balance}."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Variables: <code className="text-cyan-400 font-mono">{'{name}'}</code>, <code className="text-cyan-400 font-mono">{'{username}'}</code>, <code className="text-cyan-400 font-mono">{'{balance}'}</code>, <code className="text-cyan-400 font-mono">{'{store_name}'}</code>
                </p>
              </div>

              {/* Status Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-xl">
                <div>
                  <div className="text-xs font-bold text-white">Enable Command</div>
                  <div className="text-[11px] text-slate-500">
                    Active commands are visible in Telegram's menu autocomplete.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={editingCommand.is_enabled !== false}
                  onChange={e => setEditingCommand({ ...editingCommand, is_enabled: e.target.checked })}
                  className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500 bg-slate-800 border-slate-700"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingCommand(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveModal}
                disabled={savingCommand}
                className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 disabled:opacity-50"
              >
                {savingCommand ? 'Saving...' : editingCommand.id ? 'Update Command' : 'Create Command'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
