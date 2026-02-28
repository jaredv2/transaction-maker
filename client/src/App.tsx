import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Textarea } from './components/ui/textarea';
import { Switch } from './components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Alert, AlertDescription } from './components/ui/alert';
import { Plus, Trash2, Copy, Check, Save, Code, ShoppingCart, Zap, Pencil, Square, CheckSquare } from 'lucide-react';
import { Analytics } from "@vercel/analytics/react"
// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface LocalizedMessage {
  key: string;
  text: string;
}

interface EntitlementInfoModule {
  moduleName: string;
  name: LocalizedMessage;
  description: LocalizedMessage;
  shortDescription: LocalizedMessage;
}

// Currency is now only 'vbucks'
interface PriceDimension {
  type: 'vbucks';
  amount: number;
}

interface EntitlementDefinition {
  className: string;
  parentClass: 'island_entitlement' | 'cosmetic_entitlement' | 'custom';
  customParent?: string;
  infoModule: string;
  icon: string;
  consequentialToGameplay: boolean;
  maxCount: number;
  consumable: boolean;
  paidRandomItem: boolean;
  paidArea: boolean;
}

interface EntitlementOffer {
  className: string;
  infoModule: string;
  icon: string;
  entitlementType: string;
  price: PriceDimension;
}

interface BundleOffer {
  className: string;
  name: LocalizedMessage;
  description: LocalizedMessage;
  shortDescription: LocalizedMessage;
  icon: string;
  offers: Array<{ offerRef: string; quantity: number }>;
  price: PriceDimension;
}

interface ProjectData {
  entitlementInfos: EntitlementInfoModule[];
  entitlements: EntitlementDefinition[];
  offers: EntitlementOffer[];
  bundles: BundleOffer[];
}

// ============================================================================
// VALIDATION LOGIC
// ============================================================================

const validateEntitlement = (ent: EntitlementDefinition): string[] => {
  const errors: string[] = [];
  if (!ent.className || !/^[a-z_][a-z0-9_]*$/.test(ent.className)) {
    errors.push('Class name must be lowercase snake_case');
  }
  if (ent.maxCount < 1) {
    errors.push('MaxCount must be at least 1');
  }
  if (!ent.consumable && ent.maxCount > 1) {
    errors.push('Non-consumable entitlements should have MaxCount = 1');
  }
  return errors;
};

// New price validation function
const validatePrice = (amount: number): string[] => {
  const errors: string[] = [];
  if (amount < 50 || amount > 5000) {
    errors.push('Price must be between 50 and 5000 V-Bucks');
  }
  if (amount % 50 !== 0) {
    errors.push('Price must be a multiple of 50');
  }
  return errors;
};

// ============================================================================
// CODE GENERATORS
// ============================================================================

const generateVerseCode = (data: ProjectData): string => {
  let code = '// Generated UEFN In-Island Transactions Code - VERSE TRANSACTIONS by @encryptedasset\n';
  code += '// Do not modify manually - regenerate from configurator\n\n';
  
  if (data.entitlementInfos.length > 0) {
    code += 'EntitlementInfo<public> := module:\n\n';
    data.entitlementInfos.forEach(info => {
      code += `    ${info.moduleName}<public> := module:\n\n`;
      code += `        Name<public><localizes>:message = "${info.name.text}"\n\n`;
      code += `        Description<public><localizes>:message =\n`;
      code += `            "${info.description.text}"\n\n`;
      code += `        ShortDescription<public><localizes>:message =\n`;
      code += `            "${info.shortDescription.text}"\n\n`;
    });
  }
  
  if (data.entitlements.length > 0) {
    code += 'Entitlements<public> := module:\n\n';
    code += '    using { EntitlementInfo }\n\n';
    
    const parentClasses = new Set(data.entitlements.map(e => e.parentClass));
    parentClasses.forEach(parent => {
      if (parent !== 'custom') {
        code += `    ${parent}<public> :=\n`;
        code += `        class<abstract><castable>(entitlement){}\n\n`;
      }
    });
    
    data.entitlements.forEach(ent => {
      const parent = ent.parentClass === 'custom' ? ent.customParent : ent.parentClass;
      code += `    ${ent.className}<public> :=\n`;
      code += `        class<concrete>(${parent}):\n\n`;
      code += `            var Name<override>:message = EntitlementInfo.${ent.infoModule}.Name\n`;
      code += `            var Description<override>:message = EntitlementInfo.${ent.infoModule}.Description\n`;
      code += `            var ShortDescription<override>:message = EntitlementInfo.${ent.infoModule}.ShortDescription\n`;
      code += `            var Icon<override>:texture = ${ent.icon}\n`;
      code += `            ConsequentialToGameplay<override>:logic = ${ent.consequentialToGameplay ? 'true' : 'false'}\n`;
      code += `            MaxCount<override>:int = ${ent.maxCount}\n`;
      code += `            Consumable<override>:logic = ${ent.consumable ? 'true' : 'false'}\n\n`;
    });
  }
  
  if (data.offers.length > 0) {
    code += 'ExampleOffers<public> := module:\n\n';
    code += '    using { EntitlementInfo }\n\n';
    data.offers.forEach(offer => {
      code += `    ${offer.className}<public> := class(entitlement_offer):\n\n`;
      code += `        var Name<override>:message             = EntitlementInfo.${offer.infoModule}.Name\n`;
      code += `        var Description<override>:message      = EntitlementInfo.${offer.infoModule}.Description\n`;
      code += `        var ShortDescription<override>:message = EntitlementInfo.${offer.infoModule}.ShortDescription\n`;
      code += `        var Icon<override>:texture             = ${offer.icon}\n`;
      code += `        EntitlementType<override>:concrete_subtype(entitlement) = Entitlements.${offer.entitlementType}\n`;
      // Price is always V-Bucks now
      code += `        Price<override>:price_dimension = MakePriceVBucks(${offer.price.amount.toFixed(1)})\n\n`;
    });
  }
  
  if (data.bundles.length > 0) {
    code += 'BundleOffers<public> := module:\n\n';
    data.bundles.forEach(bundle => {
      code += `    ${bundle.className}<public> := class(bundle_offer):\n\n`;
      code += `        var Name<override>:message = "${bundle.name.text}"\n`;
      code += `        var Description<override>:message = "${bundle.description.text}"\n`;
      code += `        var ShortDescription<override>:message = "${bundle.shortDescription.text}"\n`;
      code += `        var Icon<override>:texture = ${bundle.icon}\n`;
      const offersArray = bundle.offers.map(o => `(ExampleOffers.${o.offerRef}, ${o.quantity})`).join(', ');
      code += `        Offers<override>:[]tuple(offer, int) = array{${offersArray}}\n`;
      // Price is always V-Bucks now
      code += `        Price<override>:price_dimension = MakePriceVBucks(${bundle.price.amount.toFixed(1)})\n\n`;
    });
  }
  return code;
};

// UPDATED: Matches user requested pattern for BuyOffer
const generateBuyOfferCode = (data: ProjectData, selectedItems: Set<string>): string => {
  let code = '// BuyOffer API Usage Examples - VERSE TRANSACTIONS\n';
  code += '// Suspends execution until purchase response\n\n';
  
  // Filter offers based on selection
  const activeOffers = data.offers.filter(o => selectedItems.has(o.className));
  const activeBundles = data.bundles.filter(b => selectedItems.has(b.className));

  if (activeOffers.length > 0) {
    code += '# Individual Offers\n\n';
    activeOffers.forEach(offer => {
      code += `# Purchase ${offer.className} (${offer.price.amount} V-Bucks). only works in a <suspends> function.\n`;
      code += `    Result := BuyOffer(Player, ExampleOffers.${offer.className})\n`;
      code += `    if (Result?):\n`;
      code += `        # Do nothing it should respond in the purchase subscription\n`;
      code += `    else:\n`;
      code += `        Print("Failed to buy the offer")\n\n`;
    });
  }
  
  if (activeBundles.length > 0) {
    code += '# Bundle Offers\n\n';
    activeBundles.forEach(bundle => {
      code += `# Purchase ${bundle.className} (${bundle.offers.length} items, ${bundle.price.amount} V-Bucks)\n`;
      code += `    Result := BuyOffer(Player, BundleOffers.${bundle.className}). only works in a <suspends> function.\n`;
      code += `    if (Result?):\n`;
      code += `        # Do nothing it should respond in the purchase subscription\n`;
      code += `    else:\n`;
      code += `        Print("Failed to buy the offer")\n\n`;
    });
  }

  if (activeOffers.length === 0 && activeBundles.length === 0) {
    code += '# No items selected. Select offers or bundles above to generate code.';
  }

  return code;
};

// UPDATED: Matches user requested pattern for ConsumeEntitlement
const generateConsumeCode = (data: ProjectData, selectedItems: Set<string>, quantity: number): string => {
  let code = '// ConsumeEntitlement API Usage Examples - VERSE TRANSACTIONS\n';
  code += '// Only works with consumable entitlements (Consumable = true). only works in a <suspends> function.\n';
  
  const consumableEnts = data.entitlements.filter(e => e.consumable && selectedItems.has(e.className));
  
  if (consumableEnts.length > 0) {
    consumableEnts.forEach(ent => {
      code += `# Consume ${ent.className} (MaxCount: ${ent.maxCount}, Quantity: ${quantity})\n`;
      code += `    ConsRes := ConsumeEntitlement(Player, Entitlements.${ent.className}, ?Count := ${quantity})\n`;
      code += `    if (ConsRes?):\n`;
      code += `        Print("Successfully consumed entitlement.")\n`;
      code += `        # Add custom logic here (e.g., HUD messages, stat updates)\n`;
      code += `    else:\n`;
      code += `        Print("Failed to consume entitlement.")\n\n`;
    });
  } else {
    code += '# No consumable entitlements selected or available.';
  }
  return code;
};

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

export default function App() {
  const [project, setProject] = useState<ProjectData>({
    entitlementInfos: [],
    entitlements: [],
    offers: [],
    bundles: []
  });
  
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [outputMode, setOutputMode] = useState<'verse' | 'buy' | 'consume'>('verse');
  
  // Selection State for Code Generation
  const [selectedForGen, setSelectedForGen] = useState<Set<string>>(new Set());
  // New state for consume quantity
  const [consumeQuantity, setConsumeQuantity] = useState<number>(1);

  // Editing State (Item + Index). Index -1 means new item.
  const [editInfoIndex, setEditInfoIndex] = useState<number | null>(null);
  const [editingInfo, setEditingInfo] = useState<EntitlementInfoModule | null>(null);

  const [editEntIndex, setEditEntIndex] = useState<number | null>(null);
  const [editingEntitlement, setEditingEntitlement] = useState<EntitlementDefinition | null>(null);

  const [editOfferIndex, setEditOfferIndex] = useState<number | null>(null);
  const [editingOffer, setEditingOffer] = useState<EntitlementOffer | null>(null);

  const [editBundleIndex, setEditBundleIndex] = useState<number | null>(null);
  const [editingBundle, setEditingBundle] = useState<BundleOffer | null>(null);

  // Initialize selection when project data changes
  useEffect(() => {
    // Auto-select everything initially or when new items are added for convenience
    const allIds = new Set([
      ...project.offers.map(o => o.className),
      ...project.bundles.map(b => b.className),
      ...project.entitlements.map(e => e.className)
    ]);
    setSelectedForGen(allIds);
  }, [project.offers.length, project.bundles.length, project.entitlements.length]);

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedForGen);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedForGen(newSet);
  };

  // --- SAVE HANDLERS (Create or Update) ---

  const saveInfo = () => {
    if (editingInfo) {
      setProject(prev => {
        const newList = [...prev.entitlementInfos];
        if (editInfoIndex !== null && editInfoIndex >= 0) {
          newList[editInfoIndex] = editingInfo; // Update
        } else {
          newList.push(editingInfo); // Create
        }
        return { ...prev, entitlementInfos: newList };
      });
      setEditingInfo(null);
      setEditInfoIndex(null);
    }
  };

  const saveEntitlement = () => {
    if (editingEntitlement) {
      if (validateEntitlement(editingEntitlement).length === 0) {
        setProject(prev => {
          const newList = [...prev.entitlements];
          if (editEntIndex !== null && editEntIndex >= 0) {
            newList[editEntIndex] = editingEntitlement;
          } else {
            newList.push(editingEntitlement);
          }
          return { ...prev, entitlements: newList };
        });
        setEditingEntitlement(null);
        setEditEntIndex(null);
      }
    }
  };

  const saveOffer = () => {
    if (editingOffer) {
      // Validate price before saving
      if (validatePrice(editingOffer.price.amount).length > 0) {
        return;
      }
      setProject(prev => {
        const newList = [...prev.offers];
        if (editOfferIndex !== null && editOfferIndex >= 0) {
          newList[editOfferIndex] = editingOffer;
        } else {
          newList.push(editingOffer);
        }
        return { ...prev, offers: newList };
      });
      setEditingOffer(null);
      setEditOfferIndex(null);
    }
  };

  const saveBundle = () => {
    if (editingBundle) {
      // Validate price before saving
      if (validatePrice(editingBundle.price.amount).length > 0) {
        return;
      }
      setProject(prev => {
        const newList = [...prev.bundles];
        if (editBundleIndex !== null && editBundleIndex >= 0) {
          newList[editBundleIndex] = editingBundle;
        } else {
          newList.push(editingBundle);
        }
        return { ...prev, bundles: newList };
      });
      setEditingBundle(null);
      setEditBundleIndex(null);
    }
  };

  // --- OUTPUT GENERATION ---

  const copyToClipboard = () => {
    navigator.clipboard.writeText(getOutputCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getOutputCode = () => {
    if (outputMode === 'verse') return generateVerseCode(project);
    if (outputMode === 'buy') return generateBuyOfferCode(project, selectedForGen);
    // Pass consumeQuantity to the generator
    return generateConsumeCode(project, selectedForGen, consumeQuantity);
  };

  // Reusable Styles - All rounded classes replaced with rounded-none
  const inputClass = "bg-neutral-900 border border-emerald-800 text-emerald-100 rounded-none focus:ring-1 focus:ring-emerald-500 placeholder:text-emerald-700/50";
  const labelClass = "text-emerald-500 font-semibold tracking-wide text-sm mb-1 block";
  const cardBorder = "border border-emerald-800"; // 1px stroke

  return (
    <div className="min-h-screen bg-neutral-950 text-emerald-100 p-6 font-sans">
      <Analytics />
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="mb-8 border-b border-emerald-900 pb-6 flex justify-between items-end">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {/* Changed rounded-lg to rounded-none */}
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-700 to-emerald-900 flex items-center justify-center rounded-none shadow-lg shadow-emerald-900/20">
                <Code className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600 tracking-wider uppercase">Verse Transactions</h1>
            </div>
            <p className="text-emerald-700/80 ml-13 font-mono">In-Island Transactions Code Generator</p>
          </div>
          <div className="text-emerald-800 font-mono text-sm tracking-widest uppercase pb-1">
            Made by <a className="text-emerald-600" href="https://x.com/@encryptedasset">@encryptedasset</a>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CONFIGURATION CARD */}
          {/* Changed rounded-sm to rounded-none */}
          <Card className={`bg-neutral-900/50 ${cardBorder} shadow-2xl backdrop-blur-sm rounded-none`}>
            <CardHeader className="border-b border-emerald-900/50 bg-neutral-900/80">
              <CardTitle className="text-emerald-400 uppercase tracking-wide">Configuration</CardTitle>
              <CardDescription className="text-emerald-700">Define your commerce architecture</CardDescription>
            </CardHeader>
            {/* Changed pt-6 to pt-4 to reduce padding */}
            <CardContent className="pt-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                {/* Fixed Tabs List Structure, Changed rounded-sm to rounded-none */}
                <TabsList className={`w-full bg-neutral-950 ${cardBorder} p-1 h-auto grid grid-cols-4 gap-1 rounded-none`}>
                  {['info', 'entitlements', 'offers', 'bundles'].map((tab) => (
                    <TabsTrigger 
                      key={tab}
                      value={tab} 
                      className={`
                        data-[state=active]:bg-emerald-800 
                        data-[state=active]:text-white 
                        text-emerald-700 
                        hover:text-emerald-500
                        font-bold 
                        uppercase 
                        tracking-wider 
                        py-2 
                        transition-all
                        rounded-none
                      `}
                    >
                      {tab}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {/* INFO TAB */}
                <TabsContent value="info" className="space-y-4 mt-4">
                  {!editingInfo ? (
                    <>
                      <Button 
                        onClick={() => {
                          setEditingInfo({
                            moduleName: `NewInfo${project.entitlementInfos.length + 1}`,
                            name: { key: 'name', text: '' },
                            description: { key: 'desc', text: '' },
                            shortDescription: { key: 'short', text: '' }
                          });
                          setEditInfoIndex(-1); // New Item
                        }}
                        className={`w-full bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-100 ${cardBorder} uppercase font-bold transition-all rounded-none`}
                      >
                        <Plus className="w-4 h-4 mr-2" /> New Info Module
                      </Button>
                      <div className="space-y-2">
                        {project.entitlementInfos.map((info, idx) => (
                          <div key={idx} className={`p-3 bg-neutral-900 ${cardBorder} flex justify-between items-center rounded-none`}>
                            <div className="flex-1">
                              <span className="text-emerald-400 font-mono block font-bold">{info.moduleName}</span>
                              <span className="text-emerald-600/80 text-sm">{info.name.text || "No display name"}</span>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  setEditingInfo({...info});
                                  setEditInfoIndex(idx);
                                }}
                                className="bg-emerald-900/30 hover:bg-emerald-800/50 border border-emerald-900 text-emerald-400 rounded-none"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  setProject(prev => ({
                                    ...prev,
                                    entitlementInfos: prev.entitlementInfos.filter((_, i) => i !== idx)
                                  }));
                                }}
                                className="bg-red-900/20 hover:bg-red-900/40 border border-red-900/50 text-red-400 rounded-none"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className={`space-y-4 p-4 bg-neutral-900 ${cardBorder} rounded-none shadow-inner`}>
                      <h3 className="text-emerald-400 font-bold uppercase tracking-wide border-b border-emerald-900 pb-2">
                        {editInfoIndex === -1 ? 'New Info Module' : 'Edit Info Module'}
                      </h3>
                      <div>
                        <Label className={labelClass}>Module Name (PascalCase)</Label>
                        <Input
                          value={editingInfo.moduleName}
                          onChange={(e) => setEditingInfo({...editingInfo, moduleName: e.target.value})}
                          className={`${inputClass} font-mono`}
                          placeholder="SuperSpeedInfinite"
                        />
                      </div>
                      <div>
                        <Label className={labelClass}>Display Name</Label>
                        <Input
                          value={editingInfo.name.text}
                          onChange={(e) => setEditingInfo({...editingInfo, name: {...editingInfo.name, text: e.target.value}})}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <Label className={labelClass}>Full Description</Label>
                        <Textarea
                          value={editingInfo.description.text}
                          onChange={(e) => setEditingInfo({...editingInfo, description: {...editingInfo.description, text: e.target.value}})}
                          className={`${inputClass} min-h-[80px]`}
                        />
                      </div>
                      <div>
                        <Label className={labelClass}>Short Description</Label>
                        <Input
                          value={editingInfo.shortDescription.text}
                          onChange={(e) => setEditingInfo({...editingInfo, shortDescription: {...editingInfo.shortDescription, text: e.target.value}})}
                          className={inputClass}
                        />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button onClick={saveInfo} className={`flex-1 bg-emerald-700 hover:bg-emerald-600 text-white ${cardBorder} font-bold rounded-none`}>
                          <Save className="w-4 h-4 mr-2" /> Save Info Module
                        </Button>
                        <Button onClick={() => setEditingInfo(null)} variant="outline" className="flex-1 border-emerald-800 text-emerald-600 hover:bg-emerald-900/20 hover:text-emerald-400 rounded-none">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* ENTITLEMENTS TAB */}
                <TabsContent value="entitlements" className="space-y-4 mt-4">
                  {!editingEntitlement ? (
                    <>
                      <Button 
                        onClick={() => {
                          setEditingEntitlement({
                            className: `new_entitlement_${project.entitlements.length + 1}`,
                            parentClass: 'island_entitlement',
                            infoModule: project.entitlementInfos[0]?.moduleName || '',
                            icon: 'default_icon',
                            consequentialToGameplay: true,
                            maxCount: 1,
                            consumable: false,
                            paidRandomItem: false,
                            paidArea: false
                          });
                          setEditEntIndex(-1);
                        }}
                        disabled={project.entitlementInfos.length === 0}
                        className={`w-full bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-100 ${cardBorder} uppercase font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded-none`}
                      >
                        <Plus className="w-4 h-4 mr-2" /> New Entitlement
                      </Button>

                      <div className="space-y-2">
                        {project.entitlements.map((ent, idx) => (
                          <div key={idx} className={`p-3 bg-neutral-900 ${cardBorder} flex justify-between items-center rounded-none`}>
                            <div className="flex-1">
                              <span className="text-emerald-400 font-mono block font-bold">{ent.className}</span>
                              <div className="flex gap-3 mt-1">
                                <span className="text-emerald-600/80 text-xs uppercase tracking-wide">
                                  {ent.consumable ? '🔄 Consumable' : '🔒 Permanent'}
                                </span>
                                <span className="text-emerald-600/80 text-xs uppercase tracking-wide">Max: {ent.maxCount}</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  setEditingEntitlement({...ent});
                                  setEditEntIndex(idx);
                                }}
                                className="bg-emerald-900/30 hover:bg-emerald-800/50 border border-emerald-900 text-emerald-400 rounded-none"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  setProject(prev => ({
                                    ...prev,
                                    entitlements: prev.entitlements.filter((_, i) => i !== idx)
                                  }));
                                }}
                                className="bg-red-900/20 hover:bg-red-900/40 border border-red-900/50 text-red-400 rounded-none"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className={`space-y-4 p-4 bg-neutral-900 ${cardBorder} rounded-none`}>
                       <h3 className="text-emerald-400 font-bold uppercase tracking-wide border-b border-emerald-900 pb-2">
                        {editEntIndex === -1 ? 'New Entitlement' : 'Edit Entitlement'}
                      </h3>
                      {validateEntitlement(editingEntitlement).length > 0 && (
                        <Alert className="bg-red-900/20 border-red-900/50 rounded-none">
                          <AlertDescription className="text-red-300">
                            {validateEntitlement(editingEntitlement).join(', ')}
                          </AlertDescription>
                        </Alert>
                      )}

                      <div>
                        <Label className={labelClass}>Class Name (snake_case)</Label>
                        <Input
                          value={editingEntitlement.className}
                          onChange={(e) => setEditingEntitlement({...editingEntitlement, className: e.target.value})}
                          className={`${inputClass} font-mono`}
                        />
                      </div>

                      <div>
                        <Label className={labelClass}>Info Module Reference</Label>
                        <select
                          value={editingEntitlement.infoModule}
                          onChange={(e) => setEditingEntitlement({...editingEntitlement, infoModule: e.target.value})}
                          className={`w-full p-2 bg-neutral-900 ${cardBorder} text-emerald-100 rounded-none focus:outline-none focus:ring-1 focus:ring-emerald-500`}
                        >
                          {project.entitlementInfos.map(info => (
                            <option key={info.moduleName} value={info.moduleName}>{info.moduleName}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <Label className={labelClass}>Icon Texture</Label>
                        <Input
                          value={editingEntitlement.icon}
                          onChange={(e) => setEditingEntitlement({...editingEntitlement, icon: e.target.value})}
                          className={inputClass}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className={labelClass}>Max Count</Label>
                          <Input
                            type="number"
                            min="1"
                            value={editingEntitlement.maxCount}
                            onChange={(e) => setEditingEntitlement({...editingEntitlement, maxCount: parseInt(e.target.value)})}
                            className={inputClass}
                          />
                        </div>
                        <div className="flex flex-col justify-end">
                          <div className={`flex items-center justify-between p-2 bg-neutral-950 ${cardBorder} rounded-none h-10`}>
                            <Label className="text-emerald-600/80 text-sm mb-0 cursor-pointer">Consumable</Label>
                            <Switch
                              checked={editingEntitlement.consumable}
                              onCheckedChange={(checked: boolean) => setEditingEntitlement({...editingEntitlement, consumable: checked})}
                              className="data-[state=checked]:bg-emerald-500"
                            />
                          </div>
                        </div>
                      </div>

                      <div className={`flex items-center justify-between p-2 bg-neutral-950 ${cardBorder} rounded-none`}>
                        <Label className="text-emerald-600/80 cursor-pointer">Consequential to Gameplay</Label>
                        <Switch
                          checked={editingEntitlement.consequentialToGameplay}
                          onCheckedChange={(checked) => setEditingEntitlement({...editingEntitlement, consequentialToGameplay: checked})}
                          className="data-[state=checked]:bg-emerald-500"
                        />
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button 
                          onClick={saveEntitlement} 
                          disabled={validateEntitlement(editingEntitlement).length > 0}
                          className={`flex-1 bg-emerald-700 hover:bg-emerald-600 text-white ${cardBorder} font-bold rounded-none`}
                        >
                          <Save className="w-4 h-4 mr-2" /> Save Entitlement
                        </Button>
                        <Button onClick={() => setEditingEntitlement(null)} variant="outline" className="flex-1 border-emerald-800 text-emerald-600 hover:bg-emerald-900/20 hover:text-emerald-400 rounded-none">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* OFFERS TAB */}
                <TabsContent value="offers" className="space-y-4 mt-4">
                  {!editingOffer ? (
                    <>
                      <Button 
                        onClick={() => {
                          setEditingOffer({
                            className: `new_offer_${project.offers.length + 1}`,
                            infoModule: project.entitlementInfos[0]?.moduleName || '',
                            icon: 'default_icon',
                            entitlementType: project.entitlements[0]?.className || '',
                            // Default to a valid price
                            price: { type: 'vbucks', amount: 100 }
                          });
                          setEditOfferIndex(-1);
                        }}
                        disabled={project.entitlements.length === 0}
                        className={`w-full bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-100 ${cardBorder} uppercase font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded-none`}
                      >
                        <Plus className="w-4 h-4 mr-2" /> New Offer
                      </Button>

                      <div className="space-y-2">
                        {project.offers.map((offer, idx) => (
                          <div key={idx} className={`p-3 bg-neutral-900 ${cardBorder} flex justify-between items-center rounded-none`}>
                            <div className="flex-1">
                              <span className="text-emerald-400 font-mono block font-bold">{offer.className}</span>
                              <span className="text-emerald-600/80 text-sm">
                                {offer.price.amount} V-Bucks
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  setEditingOffer({...offer});
                                  setEditOfferIndex(idx);
                                }}
                                className="bg-emerald-900/30 hover:bg-emerald-800/50 border border-emerald-900 text-emerald-400 rounded-none"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  setProject(prev => ({
                                    ...prev,
                                    offers: prev.offers.filter((_, i) => i !== idx)
                                  }));
                                }}
                                className="bg-red-900/20 hover:bg-red-900/40 border border-red-900/50 text-red-400 rounded-none"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className={`space-y-4 p-4 bg-neutral-900 ${cardBorder} rounded-none`}>
                      <h3 className="text-emerald-400 font-bold uppercase tracking-wide border-b border-emerald-900 pb-2">
                        {editOfferIndex === -1 ? 'New Offer' : 'Edit Offer'}
                      </h3>
                      
                      {/* Price Validation Alert */}
                      {validatePrice(editingOffer.price.amount).length > 0 && (
                        <Alert className="bg-red-900/20 border-red-900/50 rounded-none">
                          <AlertDescription className="text-red-300">
                            {validatePrice(editingOffer.price.amount).join(', ')}
                          </AlertDescription>
                        </Alert>
                      )}

                      <div>
                        <Label className={labelClass}>Class Name</Label>
                        <Input
                          value={editingOffer.className}
                          onChange={(e) => setEditingOffer({...editingOffer, className: e.target.value})}
                          className={`${inputClass} font-mono`}
                        />
                      </div>
                      <div>
                        <Label className={labelClass}>Entitlement Type</Label>
                        <select
                          value={editingOffer.entitlementType}
                          onChange={(e) => setEditingOffer({...editingOffer, entitlementType: e.target.value})}
                          className={`w-full p-2 bg-neutral-900 ${cardBorder} text-emerald-100 rounded-none focus:outline-none focus:ring-1 focus:ring-emerald-500`}
                        >
                          {project.entitlements.map(ent => (
                            <option key={ent.className} value={ent.className}>{ent.className}</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {/* Removed Currency Selector - Always V-Bucks */}
                        <div>
                          <Label className={labelClass}>Price (V-Bucks)</Label>
                          <Input
                            type="number"
                            // Set min/max for UI constraints, validation handled on save
                            min="50"
                            max="5000"
                            step="50"
                            value={editingOffer.price.amount}
                            onChange={(e) => setEditingOffer({...editingOffer, price: {...editingOffer.price, amount: parseFloat(e.target.value)}})}
                            className={inputClass}
                          />
                          <p className="text-xs text-emerald-600/80 mt-1">Must be between 50 and 5000, and a multiple of 50.</p>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button 
                          onClick={saveOffer} 
                          // Disable save if price is invalid
                          disabled={validatePrice(editingOffer.price.amount).length > 0}
                          className={`flex-1 bg-emerald-700 hover:bg-emerald-600 text-white ${cardBorder} font-bold rounded-none`}>
                          <Save className="w-4 h-4 mr-2" /> Save Offer
                        </Button>
                        <Button onClick={() => setEditingOffer(null)} variant="outline" className="flex-1 border-emerald-800 text-emerald-600 hover:bg-emerald-900/20 hover:text-emerald-400 rounded-none">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* BUNDLES TAB */}
                <TabsContent value="bundles" className="space-y-4 mt-4">
                  {!editingBundle ? (
                    <>
                      <Button 
                        onClick={() => {
                          setEditingBundle({
                            className: `new_bundle_${project.bundles.length + 1}`,
                            name: { key: 'name', text: '' },
                            description: { key: 'desc', text: '' },
                            shortDescription: { key: 'short', text: '' },
                            icon: 'bundle_icon',
                            offers: [],
                            // Default to a valid price
                            price: { type: 'vbucks', amount: 500 }
                          });
                          setEditBundleIndex(-1);
                        }}
                        disabled={project.offers.length === 0}
                        className={`w-full bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-100 ${cardBorder} uppercase font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded-none`}
                      >
                        <Plus className="w-4 h-4 mr-2" /> New Bundle
                      </Button>

                      <div className="space-y-2">
                        {project.bundles.map((bundle, idx) => (
                          <div key={idx} className={`p-3 bg-neutral-900 ${cardBorder} flex justify-between items-center rounded-none`}>
                            <div className="flex-1">
                              <span className="text-emerald-400 font-mono block font-bold">{bundle.className}</span>
                              <span className="text-emerald-600/80 text-sm">
                                {bundle.offers.length} offers • {bundle.price.amount} V-Bucks
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  setEditingBundle({...bundle});
                                  setEditBundleIndex(idx);
                                }}
                                className="bg-emerald-900/30 hover:bg-emerald-800/50 border border-emerald-900 text-emerald-400 rounded-none"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  setProject(prev => ({
                                    ...prev,
                                    bundles: prev.bundles.filter((_, i) => i !== idx)
                                  }));
                                }}
                                className="bg-red-900/20 hover:bg-red-900/40 border border-red-900/50 text-red-400 rounded-none"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className={`space-y-4 p-4 bg-neutral-900 ${cardBorder} rounded-none`}>
                      <h3 className="text-emerald-400 font-bold uppercase tracking-wide border-b border-emerald-900 pb-2">
                        {editBundleIndex === -1 ? 'New Bundle' : 'Edit Bundle'}
                      </h3>

                      {/* Price Validation Alert */}
                      {validatePrice(editingBundle.price.amount).length > 0 && (
                        <Alert className="bg-red-900/20 border-red-900/50 rounded-none">
                          <AlertDescription className="text-red-300">
                            {validatePrice(editingBundle.price.amount).join(', ')}
                          </AlertDescription>
                        </Alert>
                      )}

                      <div>
                        <Label className={labelClass}>Class Name (snake_case)</Label>
                        <Input
                          value={editingBundle.className}
                          onChange={(e) => setEditingBundle({ ...editingBundle, className: e.target.value })}
                          className={`${inputClass} font-mono`}
                          placeholder="starter_bundle"
                        />
                      </div>

                      <div>
                        <Label className={labelClass}>Bundle Name</Label>
                        <Input
                          value={editingBundle.name.text}
                          onChange={(e) => setEditingBundle({...editingBundle, name: { ...editingBundle.name, text: e.target.value }})}
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <Label className={labelClass}>Included Offers</Label>
                        <div className="space-y-2">
                          {project.offers.map((offer) => {
                            const existing = editingBundle.offers.find(o => o.offerRef === offer.className);
                            return (
                              <div key={offer.className} className={`flex items-center justify-between p-2 bg-neutral-900 ${cardBorder} border-emerald-900/50 rounded-none`}>
                                <span className="font-mono text-emerald-400">{offer.className}</span>
                                <Input
                                  type="number"
                                  min={0}
                                  value={existing?.quantity || 0}
                                  onChange={(e) => {
                                    const qty = parseInt(e.target.value);
                                    setEditingBundle(prev => {
                                      if (!prev) return prev;
                                      const filtered = prev.offers.filter(o => o.offerRef !== offer.className);
                                      return {
                                        ...prev,
                                        offers: qty > 0 ? [...filtered, { offerRef: offer.className, quantity: qty }] : filtered
                                      };
                                    });
                                  }}
                                  className="w-20 bg-neutral-950 border-emerald-900 text-emerald-100 rounded-none"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        {/* Removed Currency Selector - Always V-Bucks */}
                        <div>
                          <Label className={labelClass}>Price (V-Bucks)</Label>
                          <Input
                            type="number"
                            // Set min/max for UI constraints, validation handled on save
                            min="50"
                            max="5000"
                            step="50"
                            value={editingBundle.price.amount}
                            onChange={(e) => setEditingBundle({...editingBundle, price: {...editingBundle.price, amount: parseInt(e.target.value)}})}
                            className={inputClass}
                          />
                          <p className="text-xs text-emerald-600/80 mt-1">Must be between 50 and 5000, and a multiple of 50.</p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button 
                          onClick={saveBundle} 
                          // Disable save if price is invalid
                          disabled={validatePrice(editingBundle.price.amount).length > 0}
                          className={`flex-1 bg-emerald-700 hover:bg-emerald-600 text-white ${cardBorder} font-bold rounded-none`}>
                          <Save className="w-4 h-4 mr-2" /> Save Bundle
                        </Button>
                        <Button onClick={() => setEditingBundle(null)} variant="outline" className="flex-1 border-emerald-800 text-emerald-600 hover:bg-emerald-900/20 hover:text-emerald-400 rounded-none">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* GENERATED CODE CARD */}
          {/* Changed rounded-sm to rounded-none */}
          <Card className={`bg-neutral-900/50 ${cardBorder} shadow-2xl h-fit rounded-none backdrop-blur-sm`}>
            <CardHeader className="border-b border-emerald-900/50 bg-neutral-900/80">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-emerald-400 uppercase tracking-wide">Generated Code</CardTitle>
                  <CardDescription className="text-emerald-700">Production-ready Verse output</CardDescription>
                </div>
                <Button 
                  onClick={copyToClipboard} 
                  className={`bg-emerald-800 hover:bg-emerald-700 text-white ${cardBorder} font-bold rounded-none`}
                >
                  {copied ? <><Check className="w-4 h-4 mr-2" /> Copied!</> : <><Copy className="w-4 h-4 mr-2" /> Copy</>}
                </Button>
              </div>
            </CardHeader>
            {/* Changed pt-6 to pt-4 to reduce padding */}
            <CardContent className="pt-4 space-y-4">
              <div className="flex gap-2">
                <Button
                  onClick={() => setOutputMode('verse')}
                  className={`flex-1 transition-all rounded-none font-bold uppercase ${outputMode === 'verse' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-neutral-950 text-emerald-700 hover:bg-neutral-900 hover:text-emerald-400'} ${cardBorder}`}
                >
                  <Code className="w-4 h-4 mr-2" /> Verse
                </Button>
                <Button
                  onClick={() => setOutputMode('buy')}
                  className={`flex-1 transition-all rounded-none font-bold uppercase ${outputMode === 'buy' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-neutral-950 text-emerald-700 hover:bg-neutral-900 hover:text-emerald-400'} ${cardBorder}`}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" /> Buy
                </Button>
                <Button
                  onClick={() => setOutputMode('consume')}
                  className={`flex-1 transition-all rounded-none font-bold uppercase ${outputMode === 'consume' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-neutral-950 text-emerald-700 hover:bg-neutral-900 hover:text-emerald-400'} ${cardBorder}`}
                >
                  <Zap className="w-4 h-4 mr-2" /> Consume
                </Button>
              </div>

              {/* SELECTION INTERFACE (Only for Buy/Consume modes) */}
              {(outputMode === 'buy' || outputMode === 'consume') && (
                // Changed rounded-md to rounded-none
                <div className={`p-4 bg-neutral-900 ${cardBorder} mb-4 rounded-none`}>
                  <div className="text-xs text-emerald-600 uppercase tracking-wider mb-3">Select items to generate code for:</div>
                  <div className="flex flex-wrap gap-2">
                    {outputMode === 'buy' && (
                      <>
                        {[...project.offers, ...project.bundles].length === 0 && <span className="text-sm text-emerald-700">No offers available.</span>}
                        {[...project.offers, ...project.bundles].map(item => (
                          <div 
                            key={item.className}
                            onClick={() => toggleSelection(item.className)}
                            // Changed rounded-sm to rounded-none
                            className={`cursor-pointer px-3 py-1 flex items-center gap-2 border text-sm transition-colors rounded-none ${selectedForGen.has(item.className) ? 'bg-emerald-900/40 border-emerald-500 text-emerald-400' : 'bg-neutral-950 border-emerald-900 text-emerald-700'}`}
                          >
                             {selectedForGen.has(item.className) ? <CheckSquare className="w-3 h-3"/> : <Square className="w-3 h-3"/>}
                             {item.className}
                          </div>
                        ))}
                      </>
                    )}
                    {outputMode === 'consume' && (
                      <>
                         {project.entitlements.filter(e => e.consumable).length === 0 && <span className="text-sm text-emerald-700">No consumable entitlements available.</span>}
                         {project.entitlements.filter(e => e.consumable).map(item => (
                          <div 
                            key={item.className}
                            onClick={() => toggleSelection(item.className)}
                            // Changed rounded-sm to rounded-none
                            className={`cursor-pointer px-3 py-1 flex items-center gap-2 border text-sm transition-colors rounded-none ${selectedForGen.has(item.className) ? 'bg-emerald-900/40 border-emerald-500 text-emerald-400' : 'bg-neutral-950 border-emerald-900 text-emerald-700'}`}
                          >
                             {selectedForGen.has(item.className) ? <CheckSquare className="w-3 h-3"/> : <Square className="w-3 h-3"/>}
                             {item.className}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                  
                  {/* New Quantity Selector for Consume Mode */}
                  {outputMode === 'consume' && (
                    <div className="flex items-center gap-4 mt-4 border-t border-emerald-800 pt-4">
                      <Label className={labelClass + " mb-0"}>Quantity to Consume</Label>
                      <Input
                        type="number"
                        min="1"
                        value={consumeQuantity}
                        onChange={(e) => setConsumeQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className={`${inputClass} w-24`}
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="relative">
                {/* Changed rounded-md to rounded-none */}
                <pre className={`bg-black/80 text-emerald-400 p-4 rounded-none overflow-x-auto text-sm font-mono ${cardBorder} shadow-inner`}>
                  {getOutputCode()}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}