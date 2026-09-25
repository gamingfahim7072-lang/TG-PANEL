import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Sparkles,
  Save,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Bot,
  MessageSquare,
  LayoutGrid,
  Check,
  AlertCircle,
  Loader2,
  HelpCircle,
  CreditCard,
  History,
  RotateCcw,
  Send,
  ExternalLink,
  QrCode,
  ShieldCheck,
  FolderTree,
  CornerDownRight,
  ArrowLeft,
  Home,
  Layers,
  Edit3,
  Image as ImageIcon,
  Terminal
} from 'lucide-react';
import {
  TelegramBot,
  BotSettings,
  BotMenu,
  BotButton,
  BotFaq,
  BotVersion,
  BotPaymentConfig,
  BotCommand,
  Product,
  ProductCategory,
  ProductPackage
} from '../types';
import { api } from '../api';
import { BotCommandBuilder } from '../components/BotCommandBuilder';

export interface MenuActionDefinition {
  id: string;
  type: BotButton['button_type'];
  label: string;
  emoji: string;
  description: string;
  defaultLabel: string;
}

export const MENU_ACTION_DEFINITIONS: MenuActionDefinition[] = [
  {
    id: 'open_submenu',
    type: 'SUBMENU',
    label: 'Open Submenu',
    emoji: '📂',
    description: 'Navigate to a nested submenu or multi-level category folder',
    defaultLabel: '📂 Open Submenu'
  },
  {
    id: 'products_catalog',
    type: 'PRODUCTS_LIST',
    label: 'Products Catalog',
    emoji: '🛍️',
    description: 'Display all available digital products, software licenses & instant deliveries',
    defaultLabel: '🛍️ Products Catalog'
  },
  {
    id: 'view_single_product',
    type: 'SINGLE_PRODUCT',
    label: 'View Single Product',
    emoji: '📦',
    description: 'Directly show specific product card with price, description & instant checkout',
    defaultLabel: '📦 View Single Product'
  },
  {
    id: 'direct_package_tier',
    type: 'PRODUCT_PACKAGE',
    label: 'Direct Package Tier',
    emoji: '⚡',
    description: 'Fast 1-click checkout for a specific package duration or tier (1 Month, 1 Year, Lifetime)',
    defaultLabel: '⚡ Direct Package Tier'
  },
  {
    id: 'category_filter',
    type: 'CATEGORY',
    label: 'Category Filter',
    emoji: '🏷️',
    description: 'Filter catalog items under a specific category group',
    defaultLabel: '🏷️ Category Filter'
  },
  {
    id: 'payment_qr_details',
    type: 'PAYMENT_INFO',
    label: 'Payment QR & Details',
    emoji: '💳',
    description: 'Instant merchant UPI dynamic QR code and bank transfer instructions',
    defaultLabel: '💳 Payment QR & Details'
  },
  {
    id: 'customer_orders',
    type: 'MY_ORDERS',
    label: 'Customer Orders',
    emoji: '🧾',
    description: 'Show customer order history, active license keys, and serial codes',
    defaultLabel: '🧾 Customer Orders'
  },
  {
    id: 'faq_menu',
    type: 'FAQS',
    label: 'FAQ Menu',
    emoji: '❓',
    description: 'Interactive FAQ questions list with instant answers',
    defaultLabel: '❓ FAQ Menu'
  },
  {
    id: 'support_contact',
    type: 'SUPPORT_CONTACT',
    label: 'Support Contact',
    emoji: '💬',
    description: 'Direct link or prompt to reach human store support team',
    defaultLabel: '💬 Support Contact'
  },
  {
    id: 'external_url_link',
    type: 'EXTERNAL_URL',
    label: 'External URL Link',
    emoji: '🌐',
    description: 'Open external website, Telegram channel, or download page',
    defaultLabel: '🌐 External URL Link'
  },
  {
    id: 'back_button',
    type: 'BACK',
    label: 'Back Button',
    emoji: '🔙',
    description: 'Navigate back to the previous screen or parent menu',
    defaultLabel: '🔙 Back Button'
  },
  {
    id: 'main_menu',
    type: 'MAIN_MENU',
    label: 'Main Menu',
    emoji: '🏠',
    description: 'Instantly return user to the home main menu screen',
    defaultLabel: '🏠 Main Menu'
  }
];

export const getActionDefByType = (type: string): MenuActionDefinition => {
  return (
    MENU_ACTION_DEFINITIONS.find(
      d =>
        d.type === type ||
        (type === 'URL' && d.id === 'external_url_link') ||
        (type === 'SUPPORT' && d.id === 'support_contact') ||
        (type === 'FAQ' && d.id === 'faq_menu') ||
        (type === 'PRODUCT' && d.id === 'view_single_product') ||
        (type === 'OPEN_PRODUCT' && d.id === 'view_single_product') ||
        (type === 'OPEN_CATEGORY' && d.id === 'category_filter') ||
        (type === 'OPEN_SUBMENU' && d.id === 'open_submenu') ||
        (type === 'HOME' && d.id === 'main_menu')
    ) || MENU_ACTION_DEFINITIONS[1]
  );
};

export const getActionDefById = (id: string): MenuActionDefinition => {
  return MENU_ACTION_DEFINITIONS.find(d => d.id === id) || MENU_ACTION_DEFINITIONS[1];
};

interface BotEditorViewProps {
  bot: TelegramBot | null;
  onOpenLiveSimulator: () => void;
}

export const BotEditorView: React.FC<BotEditorViewProps> = ({ bot, onOpenLiveSimulator }) => {
  const [activeTab, setActiveTab] = useState<'SETTINGS' | 'START_MSG' | 'MENUS' | 'BUTTONS' | 'COMMANDS' | 'FAQS' | 'PAYMENTS' | 'VERSIONS'>('MENUS');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Settings State
  const [settings, setSettings] = useState<Partial<BotSettings>>({
    display_name: '',
    description: '',
    support_username: '',
    support_url: '',
    support_message: '',
    currency: 'INR',
    timezone: 'UTC',
    start_text: '',
    start_banner_url: '',
    start_video_url: '',
    promo_message: '',
    business_hours: '24/7 Automated Delivery',
    auto_delivery: true,
    notify_admin_on_order: true
  });

  // Multi-Level Menus State
  const [menus, setMenus] = useState<BotMenu[]>([]);
  const [selectedMenuId, setSelectedMenuId] = useState<string>('main');

  // Buttons & Option State
  const [buttons, setButtons] = useState<BotButton[]>([]);
  const [selectedButtonId, setSelectedButtonId] = useState<string | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string>('products_catalog');

  // Commands State (Command Builder)
  const [commands, setCommands] = useState<BotCommand[]>([]);

  // FAQs State
  const [faqs, setFaqs] = useState<BotFaq[]>([]);

  // Payment Config State
  const [paymentConfig, setPaymentConfig] = useState<Partial<BotPaymentConfig>>({
    enable_sandbox: true,
    enable_manual_upi: true,
    upi_id: '',
    upi_name: '',
    business_name: '',
    enable_dynamic_qr: true,
    manual_instructions: 'Transfer exact order amount and submit payment proof for instant verification.',
    bank_account_number: '',
    bank_ifsc: '',
    bank_name: ''
  });

  // Versions History State
  const [versions, setVersions] = useState<BotVersion[]>([]);

  // Context Data for Target Pickers
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);

  // Mockup Interactive State
  const [previewCurrentMenuId, setPreviewCurrentMenuId] = useState<string>('main');
  const [isPhoneCmdMenuOpen, setIsPhoneCmdMenuOpen] = useState(false);
  const [qrTestPreview, setQrTestPreview] = useState<{ qrImageUrl?: string; upiUri?: string } | null>(null);
  const [qrTestLoading, setQrTestLoading] = useState(false);

  useEffect(() => {
    if (bot) {
      loadBotConfig();
    }
  }, [bot?.id]);

  const loadBotConfig = async () => {
    if (!bot) return;
    setLoading(true);
    setError(null);
    try {
      const [settingsRes, menusRes, prodRes, catRes, verRes] = await Promise.all([
        api.getBotSettings(bot.id),
        api.getBotMenus(bot.id),
        api.getProducts({ bot_id: bot.id }),
        api.getCategories(bot.id),
        api.getBotVersions(bot.id)
      ]);

      if (settingsRes.settings) {
        setSettings(settingsRes.settings);
      } else {
        setSettings({
          display_name: bot.first_name,
          description: 'Automated digital storefront',
          currency: 'INR',
          timezone: 'UTC',
          start_text: `Welcome to ${bot.first_name}! 🚀\n\nInstant digital keys, licenses, and downloads delivered 24/7.`,
          auto_delivery: true,
          notify_admin_on_order: true
        });
      }

      // Menus
      if (menusRes.menus && menusRes.menus.length > 0) {
        setMenus(menusRes.menus);
        setSelectedMenuId(menusRes.menus[0].id || 'main');
      } else {
        const defaultMainMenu: BotMenu = {
          id: 'main',
          bot_id: bot.id,
          title: 'Main Menu',
          slug: 'main',
          message_text: `Welcome to ${bot.first_name}! 🚀\n\nSelect an option below to browse categories and products:`,
          auto_back_button: false,
          auto_home_button: false,
          columns_per_row: 2
        };
        setMenus([defaultMainMenu]);
        setSelectedMenuId('main');
      }

      if (settingsRes.buttons && settingsRes.buttons.length > 0) {
        setButtons(settingsRes.buttons);
      } else {
        // Initialize default starter buttons
        setButtons([
          {
            id: `btn-1`,
            bot_id: bot.id,
            menu_id: 'main',
            label: '🛍️ Browse Products',
            emoji: '🛍️',
            button_type: 'PRODUCTS_LIST',
            target_value: 'ALL',
            row_order: 0,
            col_order: 0
          },
          {
            id: `btn-2`,
            bot_id: bot.id,
            menu_id: 'main',
            label: '🧾 My Orders',
            emoji: '🧾',
            button_type: 'MY_ORDERS',
            target_value: 'MY_ORDERS',
            row_order: 1,
            col_order: 0
          },
          {
            id: `btn-3`,
            bot_id: bot.id,
            menu_id: 'main',
            label: '❓ FAQ & Help',
            emoji: '❓',
            button_type: 'FAQS',
            target_value: 'FAQS',
            row_order: 2,
            col_order: 0
          },
          {
            id: `btn-4`,
            bot_id: bot.id,
            menu_id: 'main',
            label: '💬 Support',
            emoji: '💬',
            button_type: 'SUPPORT_CONTACT',
            target_value: 'support',
            row_order: 2,
            col_order: 1
          }
        ]);
      }

      if (settingsRes.faqs) setFaqs(settingsRes.faqs);
      if (settingsRes.paymentConfig) setPaymentConfig(settingsRes.paymentConfig);
      if (settingsRes.commands && settingsRes.commands.length > 0) {
        setCommands(settingsRes.commands);
      } else {
        const cmdRes = await api.getBotCommands(bot.id);
        if (cmdRes.commands) setCommands(cmdRes.commands);
      }
      if (prodRes.products) setProducts(prodRes.products);
      if (catRes.categories) setCategories(catRes.categories);
      if (verRes.versions) setVersions(verRes.versions);
    } catch (err: any) {
      setError(err.message || 'Failed to load bot configuration.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = async (deployToTelegram: boolean = false) => {
    if (!bot) return;
    setError(null);
    setSuccessMessage(null);

    if (deployToTelegram) {
      setDeploying(true);
    } else {
      setSaving(true);
    }

    try {
      // Perform atomic full save across settings, menus, buttons, faqs, commands, and payment config
      await api.fullSaveBot(bot.id, {
        settings,
        menus,
        buttons,
        faqs,
        commands,
        paymentConfig
      });

      if (deployToTelegram) {
        const deployRes = await api.deployBot(bot.id, {
          createVersionSnapshot: true,
          versionLabel: `Live Deploy (${new Date().toLocaleTimeString()})`
        });
        setSuccessMessage(deployRes.message || 'Bot settings saved and synchronized live with Telegram API!');
        // Refresh versions
        const verRes = await api.getBotVersions(bot.id);
        if (verRes.versions) setVersions(verRes.versions);
      } else {
        setSuccessMessage('Bot configuration, submenus, and buttons saved successfully!');
      }

      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to save configuration. Please check your inputs.');
    } finally {
      setSaving(false);
      setDeploying(false);
    }
  };

  // Menu Handlers
  const handleAddSubmenu = () => {
    const newMenuId = `menu-${Date.now()}`;
    const newMenu: BotMenu = {
      id: newMenuId,
      bot_id: bot?.id || '',
      title: 'New Submenu',
      slug: `submenu-${menus.length}`,
      parent_menu_id: selectedMenuId !== 'main' ? selectedMenuId : 'main',
      message_text: `📂 *New Submenu*\nSelect a product tier or option below:`,
      auto_back_button: true,
      auto_home_button: true,
      columns_per_row: 2
    };
    setMenus([...menus, newMenu]);
    setSelectedMenuId(newMenuId);
  };

  const handleUpdateMenu = (menuId: string, field: keyof BotMenu, value: any) => {
    setMenus(menus.map(m => (m.id === menuId || (m.slug === menuId && menuId === 'main')) ? { ...m, [field]: value } : m));
  };

  const handleDeleteMenu = (menuId: string) => {
    if (menuId === 'main' || menus.find(m => m.id === menuId)?.slug === 'main') {
      alert('Cannot delete the default Main Menu.');
      return;
    }
    if (!confirm('Are you sure you want to delete this submenu? Its buttons will also be removed.')) return;

    setMenus(menus.filter(m => m.id !== menuId));
    setButtons(buttons.filter(b => b.menu_id !== menuId));
    setSelectedMenuId('main');
  };

  // Button Handlers
  const currentMenuButtons = buttons.filter(b => (b.menu_id || 'main') === selectedMenuId || (selectedMenuId === 'main' && !b.menu_id));

  // Auto-sync selected button and option when menu or buttons change
  useEffect(() => {
    if (currentMenuButtons.length > 0) {
      const exists = selectedButtonId && currentMenuButtons.some(b => b.id === selectedButtonId);
      if (!exists) {
        const firstBtn = currentMenuButtons[0];
        setSelectedButtonId(firstBtn.id);
        const actionDef = getActionDefByType(firstBtn.button_type);
        if (actionDef) {
          setSelectedOptionId(actionDef.id);
        }
      }
    } else {
      setSelectedButtonId(null);
    }
  }, [selectedMenuId, buttons]);

  const selectedButton = currentMenuButtons.find(b => b.id === selectedButtonId) || currentMenuButtons[0] || null;

  // Keep selectedOptionId synchronized whenever selectedButton changes
  useEffect(() => {
    if (selectedButton) {
      const actionDef = getActionDefByType(selectedButton.button_type);
      if (actionDef) {
        setSelectedOptionId(actionDef.id);
      }
    }
  }, [selectedButton?.id, selectedButton?.button_type]);

  const currentActionDef = selectedButton
    ? getActionDefByType(selectedButton.button_type)
    : getActionDefById(selectedOptionId);

  const handleAddButton = () => {
    const newId = `btn-${Date.now()}`;
    const def = getActionDefById(selectedOptionId) || MENU_ACTION_DEFINITIONS[1];
    const newBtn: BotButton = {
      id: newId,
      bot_id: bot?.id || '',
      menu_id: selectedMenuId || 'main',
      label: def.defaultLabel,
      emoji: def.emoji,
      button_type: def.type,
      target_value: 'ALL',
      row_order: currentMenuButtons.length,
      col_order: 0
    };
    setButtons(prev => [...prev, newBtn]);
    setSelectedButtonId(newId);
    setSelectedOptionId(def.id);
  };

  const handleUpdateButton = (btnId: string, field: keyof BotButton, value: any) => {
    setButtons(prev => prev.map(b => b.id === btnId ? { ...b, [field]: value } : b));
  };

  const handleDeleteButton = (btnId: string) => {
    const remaining = buttons.filter(b => b.id !== btnId);
    setButtons(remaining);

    if (selectedButtonId === btnId) {
      const remainingInMenu = remaining.filter(
        b => (b.menu_id || 'main') === selectedMenuId || (selectedMenuId === 'main' && !b.menu_id)
      );
      if (remainingInMenu.length > 0) {
        setSelectedButtonId(remainingInMenu[0].id);
        const def = getActionDefByType(remainingInMenu[0].button_type);
        if (def) setSelectedOptionId(def.id);
      } else {
        setSelectedButtonId(null);
      }
    }
  };

  const handleSelectOptionAction = (optionId: string) => {
    // 1. Immediately update reactive state for immediate UI feedback
    setSelectedOptionId(optionId);

    const def = getActionDefById(optionId);
    if (!def) return;

    let defaultTarget = 'ALL';
    let targetPkgId: string | undefined = undefined;

    if (def.type === 'SUBMENU') {
      const otherMenu = menus.find(m => m.id !== selectedMenuId);
      defaultTarget = otherMenu ? otherMenu.id : 'main';
    } else if (def.type === 'SINGLE_PRODUCT') {
      defaultTarget = products.length > 0 ? products[0].id : 'NONE';
    } else if (def.type === 'PRODUCT_PACKAGE') {
      if (products.length > 0) {
        defaultTarget = products[0].id;
        targetPkgId = products[0].packages?.[0]?.id;
      }
    } else if (def.type === 'CATEGORY') {
      defaultTarget = categories.length > 0 ? categories[0].id : 'NONE';
    } else if (def.type === 'EXTERNAL_URL') {
      defaultTarget = 'https://';
    } else if (def.type === 'SUPPORT_CONTACT') {
      defaultTarget = settings.support_username || 'support';
    } else if (def.type === 'PAYMENT_INFO') {
      defaultTarget = 'PAYMENT_DETAILS';
    } else if (def.type === 'MY_ORDERS') {
      defaultTarget = 'MY_ORDERS';
    } else if (def.type === 'FAQS') {
      defaultTarget = 'FAQS';
    } else if (def.type === 'BACK') {
      defaultTarget = 'BACK';
    } else if (def.type === 'MAIN_MENU') {
      defaultTarget = 'main';
    }

    // If no button is currently selected in this menu, create one automatically
    if (!selectedButton) {
      const newId = `btn-${Date.now()}`;
      const newBtn: BotButton = {
        id: newId,
        bot_id: bot?.id || '',
        menu_id: selectedMenuId || 'main',
        label: def.defaultLabel,
        emoji: def.emoji,
        button_type: def.type,
        target_value: defaultTarget,
        target_package_id: targetPkgId,
        row_order: currentMenuButtons.length,
        col_order: 0
      };
      setButtons(prev => [...prev, newBtn]);
      setSelectedButtonId(newId);
      return;
    }

    // Update existing selected button
    setButtons(prev =>
      prev.map(b => {
        if (b.id !== selectedButton.id) return b;
        return {
          ...b,
          button_type: def.type,
          target_value: defaultTarget,
          target_package_id: targetPkgId,
          emoji: def.emoji,
          label:
            !b.label ||
            b.label === 'New Option' ||
            b.label === 'New Button' ||
            MENU_ACTION_DEFINITIONS.some(d => d.defaultLabel === b.label)
              ? def.defaultLabel
              : b.label
        };
      })
    );
  };

  const moveButton = (btnId: string, direction: 'UP' | 'DOWN') => {
    const menuBtns = [...currentMenuButtons];
    const index = menuBtns.findIndex(b => b.id === btnId);
    if (index === -1) return;
    if (direction === 'UP' && index === 0) return;
    if (direction === 'DOWN' && index === menuBtns.length - 1) return;

    const targetIdx = direction === 'UP' ? index - 1 : index + 1;
    const temp = menuBtns[index];
    menuBtns[index] = menuBtns[targetIdx];
    menuBtns[targetIdx] = temp;

    // Update orders
    const otherBtns = buttons.filter(b => (b.menu_id || 'main') !== selectedMenuId);
    setButtons([...otherBtns, ...menuBtns.map((b, i) => ({ ...b, row_order: i }))]);
  };

  // FAQ Handlers
  const handleAddFaq = () => {
    const newFaq: BotFaq = {
      id: `faq-${Date.now()}`,
      bot_id: bot?.id || '',
      question: 'How do I receive my product?',
      answer: 'After payment confirmation, your digital license key or download link is delivered instantly here in the chat.',
      order: faqs.length
    };
    setFaqs([...faqs, newFaq]);
  };

  const handleUpdateFaq = (index: number, field: keyof BotFaq, value: any) => {
    const updated = [...faqs];
    updated[index] = { ...updated[index], [field]: value };
    setFaqs(updated);
  };

  const handleDeleteFaq = (index: number) => {
    setFaqs(faqs.filter((_, i) => i !== index));
  };

  // Version Restore Handler
  const handleRestoreVersion = async (versionId: string) => {
    if (!bot) return;
    if (!window.confirm('Restore this previous version? Current unsaved changes will be replaced.')) return;

    setLoading(true);
    setError(null);
    try {
      const res = await api.restoreBotVersion(bot.id, versionId);
      setSuccessMessage(res.message || 'Restored version successfully!');
      if (res.settings) setSettings(res.settings);
      if (res.buttons) setButtons(res.buttons);
      loadBotConfig();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to restore version.');
    } finally {
      setLoading(false);
    }
  };

  // Test Dynamic QR Generator
  const handleTestQrGeneration = async () => {
    if (!paymentConfig.upi_id) {
      alert('Please enter a Merchant UPI ID first.');
      return;
    }
    setQrTestLoading(true);
    try {
      const res = await api.generatePaymentQr({
        upi_id: paymentConfig.upi_id,
        upi_name: paymentConfig.upi_name || settings.display_name,
        business_name: paymentConfig.business_name || settings.display_name,
        amount: 499,
        order_id: `TEST-${Date.now().toString().slice(-4)}`,
        note: 'Live Store Test QR',
        currency: settings.currency || 'INR'
      });
      if (res.success) {
        setQrTestPreview({
          qrImageUrl: res.qrImageUrl,
          upiUri: res.upiUri
        });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to generate test QR');
    } finally {
      setQrTestLoading(false);
    }
  };

  const insertPlaceholder = (tag: string) => {
    setSettings(prev => ({
      ...prev,
      start_text: (prev.start_text || '') + ` ${tag}`
    }));
  };

  if (!bot) {
    return (
      <div className="p-12 text-center text-slate-400">
        Please select or connect a Telegram Bot from the Bots page to customize.
      </div>
    );
  }

  const currentMenu = menus.find(m => m.id === selectedMenuId || (m.slug === selectedMenuId && selectedMenuId === 'main')) || menus[0];

  // Preview Navigation Helper
  const previewMenu = menus.find(m => m.id === previewCurrentMenuId || (m.slug === previewCurrentMenuId && previewCurrentMenuId === 'main')) || menus[0];
  const previewButtons = buttons.filter(b => (b.menu_id || 'main') === previewCurrentMenuId || (previewCurrentMenuId === 'main' && !b.menu_id));

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl md:text-2xl font-black text-white">Bot No-Code Builder & Flow Studio</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 font-mono font-bold">
              @{bot.username}
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-400">
            Build multi-level nested menus, custom packages, payment QR codes, and instant digital fulfillment.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {bot?.username && (
            <a
              href={`https://t.me/${bot.username.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm"
              title="Open real Telegram bot in app or web"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in Telegram</span>
            </a>
          )}

          <button
            type="button"
            onClick={onOpenLiveSimulator}
            className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Simulator</span>
          </button>

          <button
            onClick={() => handleSaveAll(false)}
            disabled={saving || deploying}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all border border-slate-700 flex items-center space-x-1.5 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save All Changes</span>
              </>
            )}
          </button>

          <button
            onClick={() => handleSaveAll(true)}
            disabled={saving || deploying}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs transition-all shadow-md shadow-cyan-500/20 flex items-center space-x-2 disabled:opacity-50"
          >
            {deploying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Deploying to Telegram...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Save & Deploy to Live Bot</span>
              </>
            )}
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2 font-bold animate-in fade-in">
          <Check className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: Left Config Panel vs Right Interactive Live Phone Mockup */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Tabs and Editor Forms */}
        <div className="lg:col-span-7 bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-xl">
          {/* Tab Navigation */}
          <div className="flex border-b border-slate-800 bg-slate-900/80 overflow-x-auto">
            <button
              onClick={() => setActiveTab('MENUS')}
              className={`py-3 px-3.5 text-xs font-bold flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
                activeTab === 'MENUS'
                  ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-900'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span>Menus & Submenus ({menus.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('BUTTONS')}
              className={`py-3 px-3.5 text-xs font-bold flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
                activeTab === 'BUTTONS'
                  ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-900'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Inline Buttons ({buttons.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('COMMANDS')}
              className={`py-3 px-3.5 text-xs font-bold flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
                activeTab === 'COMMANDS'
                  ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-900'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Commands ({commands.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('START_MSG')}
              className={`py-3 px-3.5 text-xs font-bold flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
                activeTab === 'START_MSG'
                  ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-900'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Welcome Message</span>
            </button>
            <button
              onClick={() => setActiveTab('PAYMENTS')}
              className={`py-3 px-3.5 text-xs font-bold flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
                activeTab === 'PAYMENTS'
                  ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-900'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Payment QR & Gateways</span>
            </button>
            <button
              onClick={() => setActiveTab('FAQS')}
              className={`py-3 px-3.5 text-xs font-bold flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
                activeTab === 'FAQS'
                  ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-900'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>FAQs ({faqs.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('SETTINGS')}
              className={`py-3 px-3.5 text-xs font-bold flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
                activeTab === 'SETTINGS'
                  ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-900'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>General Settings</span>
            </button>
            <button
              onClick={() => setActiveTab('VERSIONS')}
              className={`py-3 px-3.5 text-xs font-bold flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
                activeTab === 'VERSIONS'
                  ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-900'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Revisions</span>
            </button>
          </div>

          {/* Tab 1: Menus & Submenus Hierarchy */}
          {activeTab === 'MENUS' && (
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <span>Navigation Structure & Submenus</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Create nested menu screens for product categories, service plans, support, or direct checkout tiers.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddSubmenu}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs rounded-xl transition-all flex items-center space-x-1 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Submenu</span>
                </button>
              </div>

              {/* Menu List Selection Chips */}
              <div className="flex flex-wrap gap-2 p-2.5 bg-slate-900/90 border border-slate-800 rounded-xl">
                {menus.map(m => {
                  const isMain = m.id === 'main' || m.slug === 'main';
                  const isSelected = selectedMenuId === m.id || (isMain && selectedMenuId === 'main');
                  const count = buttons.filter(b => (b.menu_id || 'main') === m.id || (isMain && (!b.menu_id || b.menu_id === 'main'))).length;

                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setSelectedMenuId(m.id);
                        setPreviewCurrentMenuId(m.id);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                        isSelected
                          ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-bold'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <span>{isMain ? '🏠' : '📂'}</span>
                      <span>{m.title}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-cyan-900/60 text-cyan-200' : 'bg-slate-900 text-slate-400'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Selected Menu Editor */}
              {currentMenu && (
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center space-x-2">
                      <Edit3 className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-bold text-white">
                        Editing: <span className="text-cyan-400">{currentMenu.title}</span> ({currentMenu.slug})
                      </span>
                    </div>

                    {currentMenu.slug !== 'main' && (
                      <button
                        type="button"
                        onClick={() => handleDeleteMenu(currentMenu.id)}
                        className="text-xs text-red-400 hover:text-red-300 flex items-center space-x-1 font-semibold"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Submenu</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Menu Display Title</label>
                      <input
                        type="text"
                        value={currentMenu.title}
                        onChange={e => handleUpdateMenu(currentMenu.id, 'title', e.target.value)}
                        placeholder="e.g. Netflix Subscriptions"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Menu Identifier / Slug</label>
                      <input
                        type="text"
                        value={currentMenu.slug}
                        disabled={currentMenu.slug === 'main'}
                        onChange={e => handleUpdateMenu(currentMenu.id, 'slug', e.target.value)}
                        placeholder="e.g. netflix-plans"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none font-mono disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                      Screen Text / Description (Telegram Markdown)
                    </label>
                    <textarea
                      rows={3}
                      value={currentMenu.message_text || ''}
                      onChange={e => handleUpdateMenu(currentMenu.id, 'message_text', e.target.value)}
                      placeholder="Select your preferred package duration below for instant activation:"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Banner Image URL (Optional)</label>
                      <input
                        type="url"
                        value={currentMenu.banner_url || ''}
                        onChange={e => handleUpdateMenu(currentMenu.id, 'banner_url', e.target.value)}
                        placeholder="https://example.com/banner.jpg"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Buttons Per Row</label>
                      <select
                        value={currentMenu.columns_per_row || 2}
                        onChange={e => handleUpdateMenu(currentMenu.id, 'columns_per_row', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-cyan-500"
                      >
                        <option value={1}>1 Button Per Row (Full Width Stack)</option>
                        <option value={2}>2 Buttons Per Row (Balanced Grid)</option>
                        <option value={3}>3 Buttons Per Row (Compact Grid)</option>
                      </select>
                    </div>
                  </div>

                  {currentMenu.slug !== 'main' && (
                    <div className="pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={currentMenu.auto_back_button !== false}
                          onChange={e => handleUpdateMenu(currentMenu.id, 'auto_back_button', e.target.checked)}
                          className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 accent-cyan-500"
                        />
                        <span>Auto-insert 🔙 Back button</span>
                      </label>

                      <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={currentMenu.auto_home_button !== false}
                          onChange={e => handleUpdateMenu(currentMenu.id, 'auto_home_button', e.target.checked)}
                          className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 accent-cyan-500"
                        />
                        <span>Auto-insert 🏠 Main Menu button</span>
                      </label>
                    </div>
                  )}
                  {/* Attached Menu Options & Action Buttons in Tab 1 */}
                  <div className="pt-4 border-t border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-white flex items-center space-x-1.5">
                        <LayoutGrid className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Menu Options & Buttons ({currentMenuButtons.length})</span>
                      </label>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={handleAddButton}
                          className="px-2.5 py-1 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold rounded-lg flex items-center space-x-1 transition-all"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Option</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('BUTTONS')}
                          className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center space-x-1 transition-colors"
                        >
                          <span>Options Studio →</span>
                        </button>
                      </div>
                    </div>

                    {currentMenuButtons.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500 bg-slate-950/60 rounded-xl border border-dashed border-slate-800 space-y-2">
                        <div>No options attached to this screen yet.</div>
                        <button
                          type="button"
                          onClick={handleAddButton}
                          className="px-3 py-1.5 bg-cyan-500 text-slate-950 font-bold text-xs rounded-lg inline-flex items-center space-x-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add First Option Button</span>
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {currentMenuButtons.map(b => {
                          const actionDef = getActionDefByType(b.button_type);
                          const isSelected = selectedButtonId === b.id;
                          return (
                            <div
                              key={b.id}
                              onClick={() => {
                                setSelectedButtonId(b.id);
                                const act = getActionDefByType(b.button_type);
                                if (act) setSelectedOptionId(act.id);
                              }}
                              className={`p-2.5 rounded-lg border flex items-center justify-between text-xs cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-cyan-950/40 border-cyan-500 text-cyan-300 shadow-sm ring-1 ring-cyan-500/20'
                                  : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                              }`}
                            >
                              <div className="flex items-center space-x-2 truncate">
                                <span>{b.emoji || actionDef.emoji}</span>
                                <span className="font-semibold truncate">{b.label}</span>
                              </div>
                              <span className="text-xs font-bold text-cyan-400 ml-1">
                                {isSelected ? '●' : '○'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Inline Quick Option Settings inside Tab 1 */}
                    {selectedButton && (
                      <div className="p-3.5 bg-slate-950/90 border border-slate-800 rounded-xl space-y-3 mt-3">
                        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                          <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                            <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                            <span>
                              Selected Option: <span className="text-cyan-400 font-semibold">{selectedButton.label}</span>
                            </span>
                          </span>
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => setActiveTab('BUTTONS')}
                              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold"
                            >
                              Open in Studio →
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteButton(selectedButton.id)}
                              className="text-xs text-red-400 hover:text-red-300 font-semibold flex items-center space-x-0.5 ml-2"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                          <div className="sm:col-span-1">
                            <label className="text-[11px] text-slate-400 block mb-1">Emoji</label>
                            <input
                              type="text"
                              value={selectedButton.emoji || ''}
                              onChange={e => handleUpdateButton(selectedButton.id, 'emoji', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-center text-xs text-white outline-none focus:border-cyan-500"
                            />
                          </div>
                          <div className="sm:col-span-3">
                            <label className="text-[11px] text-slate-400 block mb-1">Button Label Text</label>
                            <input
                              type="text"
                              value={selectedButton.label}
                              onChange={e => handleUpdateButton(selectedButton.id, 'label', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-semibold outline-none focus:border-cyan-500"
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[11px] font-bold text-slate-300">
                              Option Action ({MENU_ACTION_DEFINITIONS.length} Options Available):
                            </label>
                            <span className="text-[10px] text-cyan-400 font-mono">
                              Active: {currentActionDef?.label}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                            {MENU_ACTION_DEFINITIONS.map(opt => {
                              const isActionSelected = selectedOptionId === opt.id;
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => handleSelectOptionAction(opt.id)}
                                  className={`text-left p-2 rounded-lg border text-xs flex items-center justify-between transition-all cursor-pointer ${
                                    isActionSelected
                                      ? 'bg-cyan-500/15 border-cyan-400 text-white ring-1 ring-cyan-500/20'
                                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                                  }`}
                                >
                                  <span className="flex items-center space-x-1.5 truncate pr-1">
                                    <span>{opt.emoji}</span>
                                    <span className="font-semibold truncate">{opt.label}</span>
                                  </span>
                                  <span className="text-xs font-bold text-cyan-400 shrink-0">
                                    {isActionSelected ? '●' : '○'}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Inline Buttons & Option Studio (Multi-level aware) */}
          {activeTab === 'BUTTONS' && (
            <div className="p-6 space-y-5">
              {/* Header and Scope Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <span>Menu / Submenu Screen:</span>
                    <select
                      value={selectedMenuId}
                      onChange={e => {
                        setSelectedMenuId(e.target.value);
                        setPreviewCurrentMenuId(e.target.value);
                      }}
                      className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-cyan-400 font-bold outline-none focus:border-cyan-500"
                    >
                      {menus.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.title} ({buttons.filter(b => (b.menu_id || 'main') === m.id || (m.slug === 'main' && !b.menu_id)).length} options)
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Select an option below to customize its text, dynamic action, and destination.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddButton}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs rounded-xl transition-all flex items-center space-x-1.5 shadow-sm shadow-cyan-500/20 self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Button</span>
                </button>
              </div>

              {/* Master-Detail Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* Left Column: Menu Options List */}
                <div className="md:col-span-5 space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Options in {currentMenu?.title}
                    </span>
                    <span className="text-[10px] text-cyan-400 font-mono">
                      {currentMenuButtons.length} Items
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                    {currentMenuButtons.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl bg-slate-900/40">
                        <LayoutGrid className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                        <div>No options in this menu</div>
                        <p className="text-[11px] text-slate-500 mt-1">Click "+ Add Button" to add the first menu option.</p>
                      </div>
                    ) : (
                      currentMenuButtons.map((btn, idx) => {
                        const isSelected = selectedButtonId === btn.id;
                        const actionDef = getActionDefByType(btn.button_type);

                        return (
                          <div
                            key={btn.id}
                            onClick={() => {
                              setSelectedButtonId(btn.id);
                              const def = getActionDefByType(btn.button_type);
                              if (def) setSelectedOptionId(def.id);
                            }}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                              isSelected
                                ? 'bg-cyan-950/40 border-cyan-500 ring-1 ring-cyan-500/30 shadow-md shadow-cyan-500/10'
                                : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center space-x-2.5 min-w-0">
                              {/* Reorder Buttons */}
                              <div
                                className="flex flex-col space-y-1 text-slate-500"
                                onClick={e => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() => moveButton(btn.id, 'UP')}
                                  disabled={idx === 0}
                                  className="hover:text-cyan-400 disabled:opacity-20 p-0.5 transition-colors"
                                  title="Move Up"
                                >
                                  <MoveUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveButton(btn.id, 'DOWN')}
                                  disabled={idx === currentMenuButtons.length - 1}
                                  className="hover:text-cyan-400 disabled:opacity-20 p-0.5 transition-colors"
                                  title="Move Down"
                                >
                                  <MoveDown className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <span className="text-base shrink-0">{btn.emoji || actionDef.emoji}</span>

                              <div className="min-w-0">
                                <div className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                                  {btn.label || 'Unnamed Button'}
                                </div>
                                <div className="text-[10px] text-cyan-400 font-semibold truncate flex items-center space-x-1 mt-0.5">
                                  <span>{actionDef.label}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 shrink-0">
                              {/* Circular Selection Indicator */}
                              <div
                                className="flex items-center justify-center cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedButtonId(btn.id);
                                  const def = getActionDefByType(btn.button_type);
                                  if (def) setSelectedOptionId(def.id);
                                }}
                              >
                                {isSelected ? (
                                  <span
                                    className="flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500/20 border-2 border-cyan-400 text-cyan-400 font-bold text-xs shadow-sm shadow-cyan-500/30"
                                    title="Selected Option"
                                  >
                                    ●
                                  </span>
                                ) : (
                                  <span
                                    className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-slate-700 text-slate-500 font-bold text-xs hover:border-slate-500 transition-colors"
                                    title="Click to select"
                                  >
                                    ○
                                  </span>
                                )}
                              </div>

                              {/* Delete Button */}
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  handleDeleteButton(btn.id);
                                }}
                                className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-slate-800 transition-colors"
                                title="Delete Option"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Right Column: Selected Option Settings & Action Selector */}
                <div className="md:col-span-7 bg-slate-900/90 border border-slate-800 rounded-xl p-4.5 space-y-4 shadow-sm">
                  {selectedButton ? (
                    <>
                      {/* Option Header */}
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div className="flex items-center space-x-2">
                          <Edit3 className="w-4 h-4 text-cyan-400" />
                          <div>
                            <span className="text-xs font-bold text-white">
                              Option Settings: <span className="text-cyan-400">{selectedButton.label}</span>
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono ml-2">
                              id: {selectedButton.id}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteButton(selectedButton.id)}
                          className="text-xs text-red-400 hover:text-red-300 font-semibold flex items-center space-x-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>

                      {/* Display Label and Emoji */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="sm:col-span-1">
                          <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Emoji</label>
                          <input
                            type="text"
                            value={selectedButton.emoji || ''}
                            onChange={e => handleUpdateButton(selectedButton.id, 'emoji', e.target.value)}
                            placeholder="🛍️"
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-center text-sm text-white focus:border-cyan-500 outline-none"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Button Label Text</label>
                          <input
                            type="text"
                            value={selectedButton.label}
                            onChange={e => handleUpdateButton(selectedButton.id, 'label', e.target.value)}
                            placeholder="e.g. 🍿 Netflix Ultra 4K"
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:border-cyan-500 outline-none font-semibold"
                          />
                        </div>
                      </div>

                      {/* Action Type Selection (12 All Clickable Options with Dynamic Radio Indicator) */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-bold text-slate-200">
                            Select Option Action ({MENU_ACTION_DEFINITIONS.length} Options Available)
                          </label>
                          <span className="text-[10px] text-cyan-400 font-mono font-bold">
                            Active: {currentActionDef?.label}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                          {MENU_ACTION_DEFINITIONS.map(option => {
                            const isActionSelected = selectedOptionId === option.id;

                            return (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() => handleSelectOptionAction(option.id)}
                                className={`text-left p-2.5 rounded-xl border transition-all flex items-center justify-between group cursor-pointer ${
                                  isActionSelected
                                    ? 'bg-cyan-500/15 border-cyan-500 text-white shadow-sm shadow-cyan-500/10 ring-1 ring-cyan-500/20'
                                    : 'bg-slate-950/80 hover:bg-slate-800/80 border-slate-800 text-slate-300 hover:text-white'
                                }`}
                              >
                                <div className="flex items-center space-x-2 min-w-0 pr-2">
                                  <span className="text-base shrink-0">{option.emoji}</span>
                                  <div className="min-w-0">
                                    <div className={`text-xs font-bold truncate ${isActionSelected ? 'text-cyan-300' : 'text-slate-200'}`}>
                                      {option.label}
                                    </div>
                                    <div className="text-[10px] text-slate-400 truncate max-w-[170px]">
                                      {option.description}
                                    </div>
                                  </div>
                                </div>

                                {/* Dynamic Radio Selection Indicator */}
                                <div className="shrink-0 flex items-center justify-center pl-1">
                                  {isActionSelected ? (
                                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500/20 border-2 border-cyan-400 text-cyan-400 font-bold text-xs shadow-sm shadow-cyan-500/30">
                                      ●
                                    </span>
                                  ) : (
                                    <span className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-slate-700 text-slate-500 group-hover:border-slate-500 font-bold text-xs transition-colors">
                                      ○
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Action Target & Parameter Configuration */}
                      <div className="pt-3 border-t border-slate-800 space-y-3">
                        <label className="text-xs font-bold text-white block">
                          Destination & Action Configuration
                        </label>

                        {/* SUBMENU Target */}
                        {selectedButton.button_type === 'SUBMENU' && (
                          <div className="space-y-2">
                            <label className="text-xs text-slate-300 block">Select Submenu Screen to Open:</label>
                            <select
                              value={selectedButton.target_value}
                              onChange={e => handleUpdateButton(selectedButton.id, 'target_value', e.target.value)}
                              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-cyan-300 outline-none focus:border-cyan-500 font-bold"
                            >
                              {menus.map(m => (
                                <option key={m.id} value={m.id}>
                                  📂 {m.title} ({m.slug === 'main' ? 'Main Menu' : `Submenu #${m.slug}`})
                                </option>
                              ))}
                            </select>
                            {menus.length <= 1 && (
                              <button
                                type="button"
                                onClick={handleAddSubmenu}
                                className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center space-x-1"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Create a New Submenu First</span>
                              </button>
                            )}
                          </div>
                        )}

                        {/* PRODUCTS_LIST Target */}
                        {selectedButton.button_type === 'PRODUCTS_LIST' && (
                          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2">
                            <div className="text-cyan-400 font-bold flex items-center space-x-1">
                              <span>🛍️ Full Store Catalog</span>
                            </div>
                            <p className="text-[11px] text-slate-400">
                              Displays all active products in the bot with stock levels, instant pricing in {settings.currency || 'INR'}, and buy buttons.
                            </p>
                            <div className="flex items-center space-x-2">
                              <span className="text-[11px] text-slate-400">Filter Scope:</span>
                              <select
                                value={selectedButton.target_value || 'ALL'}
                                onChange={e => handleUpdateButton(selectedButton.id, 'target_value', e.target.value)}
                                className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white outline-none focus:border-cyan-500"
                              >
                                <option value="ALL">All Products Catalog ({products.length} Products)</option>
                                {categories.map(c => (
                                  <option key={c.id} value={`CAT_${c.id}`}>
                                    Only category: {c.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}

                        {/* SINGLE_PRODUCT Target */}
                        {selectedButton.button_type === 'SINGLE_PRODUCT' && (
                          <div className="space-y-2">
                            <label className="text-xs text-slate-300 block">Select Specific Product Card to Display:</label>
                            {products.length === 0 ? (
                              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400">
                                No products found in store. Please add products in the Products tab.
                              </div>
                            ) : (
                              <select
                                value={selectedButton.target_value}
                                onChange={e => handleUpdateButton(selectedButton.id, 'target_value', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-cyan-500 font-semibold"
                              >
                                {products.map(p => (
                                  <option key={p.id} value={p.id}>
                                    📦 {p.name} — {p.currency} {p.price} ({p.stock_type === 'UNLIMITED' ? 'Unlimited Stock' : `${p.stock_count || 0} keys`})
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        )}

                        {/* PRODUCT_PACKAGE Direct Tier Target */}
                        {selectedButton.button_type === 'PRODUCT_PACKAGE' && (
                          <div className="space-y-3">
                            <label className="text-xs text-slate-300 block">Select Product & Specific Duration Tier:</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-[11px] text-slate-400 block mb-1">Product</label>
                                <select
                                  value={selectedButton.target_value}
                                  onChange={e => {
                                    handleUpdateButton(selectedButton.id, 'target_value', e.target.value);
                                    const selectedProd = products.find(p => p.id === e.target.value);
                                    if (selectedProd?.packages && selectedProd.packages.length > 0) {
                                      handleUpdateButton(selectedButton.id, 'target_package_id', selectedProd.packages[0].id);
                                    }
                                  }}
                                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-cyan-500"
                                >
                                  {products.map(p => (
                                    <option key={p.id} value={p.id}>
                                      {p.name}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="text-[11px] text-slate-400 block mb-1">Package Tier</label>
                                <select
                                  value={selectedButton.target_package_id || ''}
                                  onChange={e => handleUpdateButton(selectedButton.id, 'target_package_id', e.target.value)}
                                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-cyan-300 outline-none focus:border-cyan-500 font-bold"
                                >
                                  <option value="">Default Product Tier</option>
                                  {products.find(p => p.id === selectedButton.target_value)?.packages?.map(pkg => (
                                    <option key={pkg.id} value={pkg.id}>
                                      {pkg.name} ({pkg.currency} {pkg.price})
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* CATEGORY Target */}
                        {selectedButton.button_type === 'CATEGORY' && (
                          <div className="space-y-2">
                            <label className="text-xs text-slate-300 block">Select Store Category:</label>
                            {categories.length === 0 ? (
                              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400">
                                No categories created yet. Please create a category first.
                              </div>
                            ) : (
                              <select
                                value={selectedButton.target_value}
                                onChange={e => handleUpdateButton(selectedButton.id, 'target_value', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-cyan-500 font-semibold"
                              >
                                {categories.map(c => (
                                  <option key={c.id} value={c.id}>
                                    🏷️ {c.name}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        )}

                        {/* PAYMENT_INFO QR Target */}
                        {selectedButton.button_type === 'PAYMENT_INFO' && (
                          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2">
                            <div className="text-emerald-400 font-bold flex items-center space-x-1.5">
                              <CreditCard className="w-4 h-4" />
                              <span>Merchant UPI QR & Payment Gateways</span>
                            </div>
                            <p className="text-[11px] text-slate-400">
                              Active UPI ID: <span className="text-cyan-400 font-mono font-bold">{paymentConfig.upi_id || 'Configure in Payments Tab'}</span>
                            </p>
                            <p className="text-[11px] text-slate-400">
                              Generates dynamic intent QR code with 0% gateway fees. Configure banking details in the Payments tab.
                            </p>
                          </div>
                        )}

                        {/* MY_ORDERS Target */}
                        {selectedButton.button_type === 'MY_ORDERS' && (
                          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
                            <div className="text-cyan-400 font-bold">🧾 Customer Order History & License Keys</div>
                            <p className="text-[11px] text-slate-400">
                              Directly queries and returns customer's delivered license keys, software activation credentials, and order statuses.
                            </p>
                          </div>
                        )}

                        {/* FAQS Target */}
                        {selectedButton.button_type === 'FAQS' && (
                          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
                            <div className="text-cyan-400 font-bold">❓ Interactive FAQ Knowledge Base</div>
                            <p className="text-[11px] text-slate-400">
                              Displays your configured FAQs ({faqs.length} questions available). Manage FAQ entries in the FAQs tab.
                            </p>
                          </div>
                        )}

                        {/* SUPPORT_CONTACT Target */}
                        {selectedButton.button_type === 'SUPPORT_CONTACT' && (
                          <div className="space-y-2">
                            <label className="text-xs text-slate-300 block">Support Telegram Username or Support URL:</label>
                            <input
                              type="text"
                              value={selectedButton.target_value}
                              onChange={e => handleUpdateButton(selectedButton.id, 'target_value', e.target.value)}
                              placeholder="e.g. cyber_support or https://t.me/cyber_support"
                              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:border-cyan-500 outline-none font-mono"
                            />
                          </div>
                        )}

                        {/* EXTERNAL_URL Target */}
                        {selectedButton.button_type === 'EXTERNAL_URL' && (
                          <div className="space-y-2">
                            <label className="text-xs text-slate-300 block">Destination External Web URL:</label>
                            <input
                              type="url"
                              value={selectedButton.target_value}
                              onChange={e => handleUpdateButton(selectedButton.id, 'target_value', e.target.value)}
                              placeholder="https://example.com"
                              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:border-cyan-500 outline-none font-mono"
                            />
                          </div>
                        )}

                        {/* BACK Target */}
                        {selectedButton.button_type === 'BACK' && (
                          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400">
                            🔙 Automatically navigates the customer back to their parent submenu or main menu.
                          </div>
                        )}

                        {/* MAIN_MENU Target */}
                        {selectedButton.button_type === 'MAIN_MENU' && (
                          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400">
                            🏠 Automatically returns customer to the primary store home screen.
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="p-5 text-center text-xs text-slate-400 space-y-4">
                      <div className="p-4 bg-slate-950/60 rounded-xl border border-dashed border-slate-800 space-y-1.5">
                        <LayoutGrid className="w-7 h-7 text-cyan-400 mx-auto" />
                        <div className="font-bold text-white text-xs">Select an Action to Add to this Screen</div>
                        <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                          Click any of the {MENU_ACTION_DEFINITIONS.length} option types below to instantly create, select, and configure it for this menu.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                        {MENU_ACTION_DEFINITIONS.map(option => {
                          const isActionSelected = selectedOptionId === option.id;
                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => handleSelectOptionAction(option.id)}
                              className="text-left p-2.5 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-850 hover:border-cyan-500/50 transition-all flex items-center justify-between group cursor-pointer"
                            >
                              <div className="flex items-center space-x-2 min-w-0 pr-2">
                                <span className="text-base shrink-0">{option.emoji}</span>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 truncate">
                                    {option.label}
                                  </div>
                                  <div className="text-[10px] text-slate-400 truncate max-w-[170px]">
                                    {option.description}
                                  </div>
                                </div>
                              </div>
                              <span className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-slate-700 text-slate-500 group-hover:border-cyan-400 font-bold text-xs shrink-0 transition-colors">
                                ○
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab: Telegram Command Builder */}
          {activeTab === 'COMMANDS' && (
            <BotCommandBuilder
              botId={bot.id}
              botUsername={bot.username}
              commands={commands}
              menus={menus}
              products={products}
              categories={categories}
              onCommandsChange={(newCmds) => setCommands(newCmds)}
              onPreviewCommand={(cmd) => {
                if (cmd.action_type === 'OPEN_MENU' || cmd.action_type === 'OPEN_SUBMENU') {
                  const targetMenuId = cmd.target_id || 'main';
                  setPreviewCurrentMenuId(targetMenuId);
                  setSelectedMenuId(targetMenuId);
                } else {
                  setPreviewCurrentMenuId('main');
                  setSelectedMenuId('main');
                }
              }}
            />
          )}

          {/* Tab 3: Start / Welcome Message */}
          {activeTab === 'START_MSG' && (
            <div className="p-6 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    /start Welcome Message (Markdown Supported)
                  </label>
                  <span className="text-[11px] text-slate-500">Insert Tag:</span>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-2">
                  <button
                    type="button"
                    onClick={() => insertPlaceholder('{name}')}
                    className="text-[10px] bg-slate-800 hover:bg-slate-700 text-cyan-300 px-2 py-0.5 rounded font-mono transition-colors"
                  >
                    + {'{name}'}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertPlaceholder('{first_name}')}
                    className="text-[10px] bg-slate-800 hover:bg-slate-700 text-cyan-300 px-2 py-0.5 rounded font-mono transition-colors"
                  >
                    + {'{first_name}'}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertPlaceholder('{store_name}')}
                    className="text-[10px] bg-slate-800 hover:bg-slate-700 text-cyan-300 px-2 py-0.5 rounded font-mono transition-colors"
                  >
                    + {'{store_name}'}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertPlaceholder('{balance}')}
                    className="text-[10px] bg-slate-800 hover:bg-slate-700 text-cyan-300 px-2 py-0.5 rounded font-mono transition-colors"
                  >
                    + {'{balance}'}
                  </button>
                </div>

                <textarea
                  rows={6}
                  value={settings.start_text || ''}
                  onChange={e => setSettings({ ...settings, start_text: e.target.value })}
                  placeholder="Welcome to {store_name}! 🚀&#10;&#10;Hello {first_name}, select an option below to browse digital keys and licenses."
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                  Start Banner Image URL (Optional)
                </label>
                <input
                  type="url"
                  value={settings.start_banner_url || ''}
                  onChange={e => setSettings({ ...settings, start_banner_url: e.target.value })}
                  placeholder="https://images.unsplash.com/... or https://example.com/banner.jpg"
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                  Promo Footer Message
                </label>
                <input
                  type="text"
                  value={settings.promo_message || ''}
                  onChange={e => setSettings({ ...settings, promo_message: e.target.value })}
                  placeholder="🔥 20% OFF this week with code FLASH20"
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
                />
              </div>
            </div>
          )}

          {/* Tab 4: Payments & Dynamic QR */}
          {activeTab === 'PAYMENTS' && (
            <div className="p-6 space-y-5">
              <div>
                <h3 className="text-xs font-bold text-slate-200 mb-1">Direct Merchant UPI & Dynamic QR Codes</h3>
                <p className="text-[11px] text-slate-400">
                  Accept 0% commission direct UPI payments via GPay, PhonePe, Paytm, and BHIM with automatic QR code generation.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Merchant UPI ID (VPA)</label>
                  <input
                    type="text"
                    value={paymentConfig.upi_id || ''}
                    onChange={e => setPaymentConfig({ ...paymentConfig, upi_id: e.target.value })}
                    placeholder="merchant@okhdfcbank"
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Registered Business / Payee Name</label>
                  <input
                    type="text"
                    value={paymentConfig.upi_name || ''}
                    onChange={e => setPaymentConfig({ ...paymentConfig, upi_name: e.target.value })}
                    placeholder="CyberStore Official"
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Customer Payment Instructions</label>
                <textarea
                  rows={2}
                  value={paymentConfig.manual_instructions || ''}
                  onChange={e => setPaymentConfig({ ...paymentConfig, manual_instructions: e.target.value })}
                  placeholder="Scan QR or pay to UPI ID. Then send the transaction screenshot for instant order fulfillment."
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <QrCode className="w-4 h-4 text-emerald-400" />
                    <span>Dynamic Intent QR Code Generator</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Embeds the exact order amount and reference into the QR code automatically.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTestQrGeneration}
                  disabled={qrTestLoading}
                  className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs rounded-xl border border-emerald-500/40 transition-all flex items-center space-x-1.5"
                >
                  {qrTestLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <QrCode className="w-3.5 h-3.5" />}
                  <span>Test QR Generation</span>
                </button>
              </div>

              {qrTestPreview && (
                <div className="p-4 bg-slate-900 border border-emerald-500/40 rounded-xl flex flex-col sm:flex-row items-center gap-4 animate-in fade-in">
                  <img
                    src={qrTestPreview.qrImageUrl}
                    alt="Test UPI QR"
                    referrerPolicy="no-referrer"
                    className="w-32 h-32 rounded-lg bg-white p-2 border border-slate-700 shadow-md"
                  />
                  <div className="space-y-1 text-xs">
                    <div className="text-emerald-400 font-bold">Standard NPCI UPI QR Verified:</div>
                    <div className="text-slate-300 font-mono text-[11px] break-all bg-slate-950 p-2 rounded border border-slate-800">
                      {qrTestPreview.upiUri}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Customers will scan this directly inside Google Pay, PhonePe, Paytm, or BHIM.
                    </div>
                  </div>
                </div>
              )}

              {/* Toggles */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <label className="flex items-center justify-between p-3 bg-slate-900 rounded-xl cursor-pointer hover:bg-slate-800/80 transition-colors">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    <div>
                      <div className="text-xs font-bold text-white">Instant Sandbox / Test Checkout Mode</div>
                      <div className="text-[11px] text-slate-400">Allows instant automated testing and order verification in bot simulator</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={paymentConfig.enable_sandbox ?? true}
                    onChange={e => setPaymentConfig({ ...paymentConfig, enable_sandbox: e.target.checked })}
                    className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 accent-cyan-500"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Tab 5: FAQs */}
          {activeTab === 'FAQS' && (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-xs font-bold text-slate-200">Interactive Bot FAQs</span>
                  <p className="text-[11px] text-slate-400">Telegram users can tap FAQ questions to read instant answers</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddFaq}
                  className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add FAQ</span>
                </button>
              </div>

              <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
                {faqs.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                    No FAQs added. Add common questions to reduce customer support inquiries.
                  </div>
                ) : (
                  faqs.map((faq, idx) => (
                    <div key={idx} className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-cyan-400">Question #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteFaq(idx)}
                          className="text-red-400 hover:text-red-300 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={faq.question}
                        onChange={e => handleUpdateFaq(idx, 'question', e.target.value)}
                        placeholder="e.g. How does automatic delivery work?"
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:border-cyan-500 outline-none font-semibold"
                      />
                      <textarea
                        rows={2}
                        value={faq.answer}
                        onChange={e => handleUpdateFaq(idx, 'answer', e.target.value)}
                        placeholder="e.g. Keys and downloads are delivered instantly in this chat right after payment verification."
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:border-cyan-500 outline-none leading-relaxed"
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Tab 6: General Settings */}
          {activeTab === 'SETTINGS' && (
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Store Display Name</label>
                  <input
                    type="text"
                    value={settings.display_name || ''}
                    onChange={e => setSettings({ ...settings, display_name: e.target.value })}
                    placeholder="e.g. CyberVault Digital Store"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Support Telegram Username</label>
                  <input
                    type="text"
                    value={settings.support_username || ''}
                    onChange={e => setSettings({ ...settings, support_username: e.target.value })}
                    placeholder="e.g. cyber_support (without @)"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Store Description / Bio</label>
                <input
                  type="text"
                  value={settings.description || ''}
                  onChange={e => setSettings({ ...settings, description: e.target.value })}
                  placeholder="Automated digital software, license keys, and premium accounts 24/7."
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Currency</label>
                  <select
                    value={settings.currency || 'INR'}
                    onChange={e => setSettings({ ...settings, currency: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-cyan-500"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Timezone</label>
                  <select
                    value={settings.timezone || 'UTC'}
                    onChange={e => setSettings({ ...settings, timezone: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-cyan-500"
                  >
                    <option value="UTC">UTC (Universal)</option>
                    <option value="Asia/Kolkata">IST (India)</option>
                    <option value="America/New_York">EST (New York)</option>
                    <option value="Europe/London">GMT (London)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Operating Hours</label>
                  <input
                    type="text"
                    value={settings.business_hours || ''}
                    onChange={e => setSettings({ ...settings, business_hours: e.target.value })}
                    placeholder="24/7 Automated"
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 space-y-3">
                <label className="flex items-center justify-between p-3 bg-slate-900 rounded-xl cursor-pointer hover:bg-slate-800/80 transition-colors">
                  <div>
                    <div className="text-xs font-bold text-white">Instant Auto-Delivery Fulfillment</div>
                    <div className="text-[11px] text-slate-400">
                      Instantly deliver serial keys or file tokens right in the Telegram chat upon order confirmation.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.auto_delivery ?? true}
                    onChange={e => setSettings({ ...settings, auto_delivery: e.target.checked })}
                    className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 accent-cyan-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-slate-900 rounded-xl cursor-pointer hover:bg-slate-800/80 transition-colors">
                  <div>
                    <div className="text-xs font-bold text-white">Admin Telegram Alerts</div>
                    <div className="text-[11px] text-slate-400">
                      Send order notification to your admin Telegram ID when customer purchases.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notify_admin_on_order ?? true}
                    onChange={e => setSettings({ ...settings, notify_admin_on_order: e.target.checked })}
                    className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 accent-cyan-500"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Tab 7: Revisions History */}
          {activeTab === 'VERSIONS' && (
            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-200 mb-1">Version History & Revisions</h3>
                <p className="text-[11px] text-slate-400 mb-4">
                  Every time you deploy to Telegram, a complete snapshot is preserved for 1-click instant rollback.
                </p>
              </div>

              <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1">
                {versions.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                    No revisions yet. Click "Save & Deploy to Live Bot" to create your first version snapshot.
                  </div>
                ) : (
                  versions.map(ver => (
                    <div
                      key={ver.id}
                      className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-white flex items-center space-x-2">
                          <span>Revision #{ver.version_number}</span>
                          <span className="text-[10px] text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">
                            {ver.label}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {new Date(ver.created_at).toLocaleString()} • {ver.buttons?.length || 0} buttons • {ver.menus?.length || 1} menus
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRestoreVersion(ver.id)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs rounded-lg transition-colors flex items-center space-x-1.5 border border-slate-700"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Rollback</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Live Interactive Phone Mockup */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full max-w-sm bg-[#080d1a] border-4 border-slate-700 rounded-[36px] shadow-2xl p-4 relative overflow-hidden flex flex-col h-[620px]">
            {/* Phone Speaker Notch */}
            <div className="w-24 h-4 bg-slate-800 rounded-full mx-auto mb-3 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-slate-950"></div>
            </div>

            {/* Telegram Header */}
            <div className="bg-[#1e293b] p-2.5 rounded-xl border border-slate-700/80 flex items-center space-x-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-cyan-500 flex items-center justify-center text-white font-bold text-xs">
                <Bot className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-white truncate">
                  {settings.display_name || bot.first_name}
                </div>
                <div className="text-[10px] text-cyan-400 font-mono">
                  {previewMenu?.title ? `Screen: ${previewMenu.title}` : 'bot'}
                </div>
              </div>
              {previewCurrentMenuId !== 'main' && (
                <button
                  type="button"
                  onClick={() => setPreviewCurrentMenuId('main')}
                  className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                  title="Return to Main Menu in Mockup"
                >
                  <Home className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Chat Bubble Area */}
            <div className="flex-1 overflow-y-auto space-y-2.5 p-2.5 bg-[#0b0f19] rounded-xl border border-slate-800/80">
              {/* Optional Banner */}
              {(previewMenu?.banner_url || (previewCurrentMenuId === 'main' && settings.start_banner_url)) && (
                <div className="rounded-lg overflow-hidden border border-slate-700">
                  <img
                    src={previewMenu?.banner_url || settings.start_banner_url}
                    alt="Banner"
                    referrerPolicy="no-referrer"
                    className="w-full h-24 object-cover"
                  />
                </div>
              )}

              {/* Bot Message Bubble */}
              <div className="bg-slate-800 border border-slate-700 p-3 rounded-xl rounded-bl-sm text-xs text-slate-200 shadow-md">
                <div className="whitespace-pre-wrap leading-relaxed text-[11px]">
                  {(previewCurrentMenuId === 'main' ? (settings.start_text || currentMenu?.message_text) : previewMenu?.message_text)
                    ?.replace('{store_name}', settings.display_name || bot.first_name)
                    ?.replace('{name}', 'Customer')
                    ?.replace('{first_name}', 'Alex')
                    ?.replace('{username}', '@alex_buyer')
                    ?.replace('{balance}', `${settings.currency || '₹'} 0.00`) ||
                    `Welcome to ${settings.display_name || bot.first_name}! 🚀\n\nInstant digital keys and files available.`}
                </div>
                {previewCurrentMenuId === 'main' && settings.promo_message && (
                  <div className="mt-2 text-[10px] font-bold text-amber-400 border-t border-slate-700/80 pt-1">
                    {settings.promo_message}
                  </div>
                )}
              </div>

              {/* Interactive Inline Buttons Preview */}
              <div className="space-y-1.5 pt-1">
                {previewButtons.length === 0 ? (
                  <div className="text-center text-[10px] text-slate-600 py-3">No buttons on this screen</div>
                ) : (
                  previewButtons.map((b) => {
                    const isSelectedInEditor = selectedButtonId === b.id;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          setSelectedButtonId(b.id);
                          const def = getActionDefByType(b.button_type);
                          if (def) setSelectedOptionId(def.id);
                          if (b.button_type === 'SUBMENU' && b.target_value) {
                            setPreviewCurrentMenuId(b.target_value);
                            setSelectedMenuId(b.target_value);
                          } else if (b.button_type === 'MAIN_MENU') {
                            setPreviewCurrentMenuId('main');
                            setSelectedMenuId('main');
                          } else if (b.button_type === 'BACK') {
                            setPreviewCurrentMenuId('main');
                            setSelectedMenuId('main');
                          }
                        }}
                        className={`w-full p-2 rounded-lg border text-center text-xs font-semibold shadow-sm transition-all flex items-center justify-between px-3 ${
                          isSelectedInEditor
                            ? 'bg-cyan-950/70 border-cyan-400 text-cyan-300 ring-1 ring-cyan-500/40 shadow-sm'
                            : 'bg-slate-800 hover:bg-slate-700 active:bg-cyan-950 border-slate-700 text-cyan-300'
                        }`}
                      >
                        <span className="flex items-center space-x-1.5 truncate">
                          <span>{b.emoji || '👉'}</span>
                          <span className="truncate">{b.label}</span>
                        </span>
                        <span className={`text-[11px] font-bold shrink-0 ml-1.5 ${isSelectedInEditor ? 'text-cyan-400' : 'text-slate-600'}`}>
                          {isSelectedInEditor ? '●' : '○'}
                        </span>
                      </button>
                    );
                  })
                )}

                {/* Auto Back & Home Preview for Submenus */}
                {previewCurrentMenuId !== 'main' && (
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewCurrentMenuId('main');
                        setSelectedMenuId('main');
                      }}
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold flex items-center justify-center space-x-1"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      <span>Back</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewCurrentMenuId('main');
                        setSelectedMenuId('main');
                      }}
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold flex items-center justify-center space-x-1"
                    >
                      <Home className="w-3 h-3" />
                      <span>Main Menu</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Telegram Interactive Command Bar with [/] Menu */}
            <div className="relative mt-2">
              {/* Command Popover */}
              {isPhoneCmdMenuOpen && (
                <div className="absolute bottom-12 left-0 right-0 bg-[#141e30] border border-slate-700 rounded-xl p-2 shadow-2xl z-30 max-h-48 overflow-y-auto space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider flex justify-between items-center border-b border-slate-700/60 pb-1 mb-1">
                    <span>Telegram Commands</span>
                    <button
                      type="button"
                      onClick={() => setIsPhoneCmdMenuOpen(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                  {commands.filter(c => c.is_enabled).length === 0 ? (
                    <div className="p-2 text-center text-[10px] text-slate-500">No active commands</div>
                  ) : (
                    commands
                      .filter(c => c.is_enabled)
                      .map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            if (c.action_type === 'OPEN_MENU' || c.action_type === 'OPEN_SUBMENU') {
                              const targetMenuId = c.target_id || 'main';
                              setPreviewCurrentMenuId(targetMenuId);
                              setSelectedMenuId(targetMenuId);
                            } else {
                              setPreviewCurrentMenuId('main');
                              setSelectedMenuId('main');
                            }
                            setIsPhoneCmdMenuOpen(false);
                          }}
                          className="w-full px-2 py-1.5 rounded-lg hover:bg-slate-800 text-left text-[11px] flex items-center justify-between transition-colors"
                        >
                          <span className="font-mono font-bold text-cyan-400">{c.command}</span>
                          <span className="text-[10px] text-slate-300 truncate max-w-[130px]">{c.description}</span>
                        </button>
                      ))
                  )}
                </div>
              )}

              {/* Bottom Input Pill */}
              <div className="flex items-center space-x-1.5 bg-[#111827] border border-slate-700 rounded-2xl p-1.5 shadow-inner">
                <button
                  type="button"
                  onClick={() => setIsPhoneCmdMenuOpen(!isPhoneCmdMenuOpen)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-mono font-black transition-all flex items-center space-x-1 ${
                    isPhoneCmdMenuOpen
                      ? 'bg-cyan-500 text-slate-950 shadow-sm'
                      : 'bg-slate-800 hover:bg-slate-700 text-cyan-400'
                  }`}
                  title="Toggle Telegram Commands Menu"
                >
                  <span>/</span>
                  <span className="font-sans font-bold text-[10px]">Menu</span>
                </button>
                <div className="flex-1 text-[11px] text-slate-500 px-1 truncate">
                  Message {settings.display_name || bot.first_name}...
                </div>
              </div>
            </div>

            <div className="mt-2.5 text-center text-[10px] text-slate-500 font-medium">
              Interactive Navigation Mockup • Tap buttons or / Menu to test
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
