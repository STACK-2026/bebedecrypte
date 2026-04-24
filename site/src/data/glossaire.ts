/**
 * Glossaire BébéDécrypte : vocabulaire nutrition bebe vulgarise pour parents.
 * Chaque entree : definition FR + traduction EN + exemple concret + maillage interne
 * + source autorite verifiee (ANSES, EFSA, OMS, ESPGHAN, RappelConso...).
 *
 * Utilise par : Glossaire.astro (inline), AutoGlossaire.astro (auto-wrap articles), /glossaire (pillar SEO).
 * Cle = terme en minuscules. L'affichage garde la casse fournie par l'auteur.
 */

export interface GlossaireEntry {
  definition: string; // FR + EN combines (EN commence par "EN:")
  example: string;
  internalLink: { href: string; label: string };
  externalSource: { url: string; label: string };
  category: "nutrition" | "additifs" | "labels" | "securite" | "laits" | "allergenes";
  aliases?: string[];
}

export const glossaire: Record<string, GlossaireEntry> = {
  // ==========================================================================
  // CATEGORIE : NUTRITION (classifications, notations, scores)
  // ==========================================================================
  "nova": {
    definition: "Classification scientifique brésilienne (Monteiro, 2010) qui range les aliments en 4 groupes selon leur degré de transformation. NOVA 1 = brut, NOVA 4 = ultra-transforme (biscuits bebe industriels, cereales sucrees). Utilisee par l'OMS et l'INSERM pour etudier le lien entre ultra-transformation et sante. EN: NOVA is a food classification that groups foods by processing level from 1 (unprocessed) to 4 (ultra-processed). The higher the NOVA score, the more industrial additives, cosmetic ingredients, and hidden sugars a product contains.",
    example: "Une puree de carotte bio sans sucre ajoute = NOVA 1. Un biscuit bebe aux cereales avec sirop de glucose, huile de palme et aromes = NOVA 4.",
    internalLink: { href: "/methodology", label: "Notre methodologie de notation" },
    externalSource: { url: "https://www.fao.org/3/ca5644en/ca5644en.pdf", label: "FAO NOVA 2019" },
    category: "nutrition",
    aliases: ["nova 4", "ultra-transforme", "ultra transforme", "classification nova"],
  },
  "nutri-score": {
    definition: "Logo nutritionnel francais (A vert a E rouge) qui evalue la qualite nutritionnelle globale d'un aliment via un calcul fixe (calories, sucres, sel, graisses saturees vs fibres, proteines, fruits/legumes). EN: Nutri-Score is the French front-of-pack nutrition label ranking foods from A (green, best) to E (red, worst). Attention : NON applicable aux aliments specifiquement destines aux enfants de moins de 36 mois (exclus par l'ANSES 2017) car les besoins nutritionnels des bebes sont specifiques.",
    example: "Un yaourt nature adulte = A. Une compote sucree generaliste = C ou D. Sur un petit pot bebe, le Nutri-Score n'apparait pas, c'est voulu : il n'est pas calibre pour les tout-petits.",
    internalLink: { href: "/methodology", label: "Pourquoi on va au-dela du Nutri-Score" },
    externalSource: { url: "https://www.santepubliquefrance.fr/determinants-de-sante/nutrition-et-activite-physique/articles/nutri-score", label: "Sante Publique France" },
    category: "nutrition",
    aliases: ["nutriscore"],
  },
  "anses": {
    definition: "Agence nationale de securite sanitaire de l'alimentation (France). Publie les reperes nutritionnels officiels, les avis sur les contaminants (pesticides, metaux lourds) et les limites d'additifs. Source de reference pour tout ce qui concerne la nutrition bebe en France. EN: ANSES is the French food safety agency publishing official nutritional guidelines, contaminant limits, and additive risk assessments. Their advice is the baseline for French infant-nutrition regulation.",
    example: "L'ANSES a fixe en 2019 les reperes de diversification alimentaire bebe : introduction progressive entre 4 et 6 mois, allergenes precoces possibles.",
    internalLink: { href: "/methodology", label: "Nos sources officielles" },
    externalSource: { url: "https://www.anses.fr/fr/content/alimentation-des-enfants-de-moins-de-3-ans", label: "ANSES alimentation -3 ans" },
    category: "nutrition",
    aliases: ["agence nationale securite sanitaire"],
  },
  "efsa": {
    definition: "European Food Safety Authority. Equivalent europeen de l'ANSES, bras scientifique de la Commission europeenne sur la securite alimentaire. Fixe les doses journalieres admissibles (DJA) pour additifs, les limites de pesticides et les apports de reference pour nourrissons. EN: The European Food Safety Authority sets EU-wide food safety limits : acceptable daily intakes for additives, pesticide residue caps, and infant nutrition reference values. Its scientific opinions are binding for baby-food manufacturers sold in the EU.",
    example: "L'EFSA a abaisse la DJA de l'aspartame et reevalue regulierement la securite des additifs E.",
    internalLink: { href: "/encyclopedia", label: "Encyclopedie des additifs" },
    externalSource: { url: "https://www.efsa.europa.eu/", label: "EFSA" },
    category: "nutrition",
    aliases: ["european food safety authority"],
  },
  "espghan": {
    definition: "European Society for Paediatric Gastroenterology, Hepatology and Nutrition. Societe savante europeenne de pediatrie digestive et nutrition. Leurs recommandations (diversification, laits infantiles, allergies) sont les references cliniques utilisees par les pediatres francais. EN: ESPGHAN is the European pediatric gastroenterology and nutrition society whose guidelines on complementary feeding, infant formula composition, and allergy prevention are the clinical benchmark across Europe.",
    example: "L'ESPGHAN recommande depuis 2017 l'introduction des allergenes (arachide, oeuf) entre 4 et 6 mois pour prevenir les allergies.",
    internalLink: { href: "/blog", label: "Recommandations pediatriques" },
    externalSource: { url: "https://www.espghan.org/", label: "ESPGHAN" },
    category: "nutrition",
    aliases: [],
  },
  "rappelconso": {
    definition: "Site officiel du gouvernement francais (DGCCRF) qui centralise les rappels de produits : contamination microbiologique, allergene non declare, corps etranger, depassement de pesticides. Surveille en permanence pour les produits bebe. EN: RappelConso is the French government's official consumer-product recall database, flagging contaminated batches, undeclared allergens, and foreign bodies. We monitor baby-food recalls daily.",
    example: "En 2022, plusieurs lots de laits infantiles Lactalis ont ete rappeles sur RappelConso pour contamination Salmonella.",
    internalLink: { href: "/products", label: "Produits actuellement notes" },
    externalSource: { url: "https://rappel.conso.gouv.fr/", label: "RappelConso" },
    category: "securite",
    aliases: ["rappel conso", "rappel de produit"],
  },
  "aplv": {
    definition: "Allergie aux proteines de lait de vache. Premiere allergie alimentaire chez le nourrisson (2 a 3% des bebes). Se manifeste par eczema, troubles digestifs, parfois reaction severe. Necessite un lait hypoallergenique (hydrolysat pousse) ou a base de riz sur prescription. EN: CMPA (cow's milk protein allergy) affects 2 to 3 percent of infants. Symptoms include eczema, digestive issues, sometimes severe reactions. Requires an extensively hydrolysed formula or rice-based formula on prescription.",
    example: "Un bebe avec APLV ne tolere ni lait infantile standard, ni lait de chevre ou brebis (proteines croisees). Seuls les hydrolysats pousses ou aminoacides sont surs.",
    internalLink: { href: "/encyclopedia", label: "Guide allergies bebe" },
    externalSource: { url: "https://www.anses.fr/fr/content/allergies-alimentaires", label: "ANSES allergies" },
    category: "allergenes",
    aliases: ["allergie proteines lait de vache", "allergie lait de vache", "cmpa"],
  },
  "diversification alimentaire": {
    definition: "Periode d'introduction progressive des aliments solides, recommandee entre 4 et 6 mois revolus par l'ANSES et l'ESPGHAN. Avant 4 mois : risque digestif et allergique. Apres 6 mois : retard peut augmenter le risque d'allergies. Allergenes precoces (arachide, oeuf) maintenant conseilles. EN: Complementary feeding is the gradual introduction of solid foods between 4 and 6 months as recommended by ANSES and ESPGHAN. Earlier is digestively risky, later increases allergy risk. Introducing allergens (peanut, egg) early is now encouraged.",
    example: "A 4 mois : purees lisses de legumes, une cuillere. A 6 mois : viandes, poisson, oeuf, arachide sous forme lisse. A 9 mois : petits morceaux.",
    internalLink: { href: "/blog", label: "Diversification : par ou commencer" },
    externalSource: { url: "https://www.mangerbouger.fr/l-essentiel/les-recommandations-sur-l-alimentation/alimentation-des-enfants-de-la-naissance-a-3-ans", label: "Manger Bouger bebe" },
    category: "nutrition",
    aliases: ["diversification", "introduction alimentaire"],
  },
  "lait 1er age": {
    definition: "Lait infantile destine aux bebes de 0 a 6 mois, seule alternative au lait maternel. Composition strictement encadree par le reglement europeen (EU) 2016/127 : proteines, lipides, glucides, fer, vitamines dans des fourchettes precises. EN: Stage 1 formula is designed for 0-6 month infants as the only safe alternative to breastmilk. Composition is tightly regulated by EU Regulation 2016/127 specifying protein, lipid, carbohydrate, iron, and vitamin ranges.",
    example: "Un lait 1er age en poudre se reconstitue avec de l'eau a 40 degres (1 mesure pour 30 ml). Jamais de lait de vache avant 12 mois : trop de proteines pour les reins.",
    internalLink: { href: "/products/laits-infantiles", label: "Classement laits infantiles" },
    externalSource: { url: "https://eur-lex.europa.eu/eli/reg_del/2016/127", label: "Reglement UE 2016/127" },
    category: "laits",
    aliases: ["lait infantile 1", "lait premier age", "formula 1"],
  },
  "lait 2e age": {
    definition: "Lait de suite pour bebes de 6 a 12 mois, parfois jusqu'a 3 ans sous appellation lait de croissance. Enrichi en fer et acides gras essentiels car la diversification couvre partiellement les besoins. EN: Stage 2 follow-on formula for 6-12 month infants (sometimes continued to 3 years as growth milk). Enriched in iron and essential fatty acids because complementary feeding only partially covers needs.",
    example: "Un bebe de 8 mois qui mange varie recoit 500 ml de lait 2e age par jour + ses repas solides.",
    internalLink: { href: "/products/laits-infantiles", label: "Classement laits 2e age" },
    externalSource: { url: "https://www.anses.fr/fr/content/alimentation-des-enfants-de-moins-de-3-ans", label: "ANSES laits infantiles" },
    category: "laits",
    aliases: ["lait de suite", "lait deuxieme age"],
  },
  "lait 3e age": {
    definition: "Lait de croissance destine aux enfants de 1 a 3 ans. Pas obligatoire : un enfant qui mange varie peut passer au lait de vache demi-ecreme apres 12 mois. Mais le lait de croissance apporte plus de fer et moins de proteines. EN: Stage 3 growth milk is aimed at 1-3 year-olds. Not mandatory : a varied diet combined with whole cow's milk after 12 months is acceptable. Growth milk does provide more iron and less excess protein.",
    example: "Un enfant de 18 mois peut boire du lait de croissance ou du lait de vache entier : la difference pese surtout sur l'apport en fer.",
    internalLink: { href: "/products", label: "Classement laits bebe" },
    externalSource: { url: "https://www.mangerbouger.fr/", label: "Manger Bouger" },
    category: "laits",
    aliases: ["lait de croissance", "lait troisieme age"],
  },

  // ==========================================================================
  // CATEGORIE : ADDITIFS (ingredients industriels couramment rencontres)
  // ==========================================================================
  "maltodextrine": {
    definition: "Sucre industriel obtenu par hydrolyse d'amidon (mais, ble, pomme de terre). Index glycemique tres eleve (plus haut que le sucre blanc). Utilise comme epaississant et pour augmenter la duree de conservation. Decriee dans les produits bebe car elle habitue au gout sucre sans apport nutritionnel. EN: Maltodextrin is an industrial sugar derived from starch hydrolysis (corn, wheat, potato). Higher glycemic index than table sugar. Used as thickener and shelf-life extender. Controversial in baby foods because it trains a sweet palate without nutritional benefit.",
    example: "Une gourde bebe aux fruits qui annonce 'sans sucres ajoutes' mais contient 'maltodextrine de mais' en 3e ingredient : c'est un sucre cache.",
    internalLink: { href: "/encyclopedia/maltodextrine", label: "Maltodextrine : tout comprendre" },
    externalSource: { url: "https://www.efsa.europa.eu/en/topics/topic/sugars", label: "EFSA sucres" },
    category: "additifs",
    aliases: ["maltodextrines"],
  },
  "sirop de glucose": {
    definition: "Sucre liquide industriel obtenu a partir d'amidon (mais, ble). Moins sucrant que le saccharose mais avec un index glycemique eleve. Frequent dans biscuits bebe, cereales infantiles et compotes industrielles. A eviter avant 3 ans selon l'ANSES. EN: Glucose syrup is a liquid industrial sugar from starch. Less sweet than sucrose but with a high glycemic index. Common in baby biscuits, infant cereals, and industrial compotes. ANSES advises avoiding added sugars before age 3.",
    example: "Un biscuit bebe qui liste 'sirop de glucose' ou 'sirop de glucose-fructose' dans les 3 premiers ingredients : verdict E chez BébéDécrypte.",
    internalLink: { href: "/encyclopedia/sucres-caches", label: "Les sucres caches" },
    externalSource: { url: "https://www.anses.fr/fr/content/le-sucre-une-place-limitee-dans-lalimentation", label: "ANSES sucres" },
    category: "additifs",
    aliases: ["sirop glucose", "sirop de glucose-fructose"],
  },
  "huile de palme": {
    definition: "Graisse vegetale extraite du fruit du palmier. Riche en acides gras satures (50%). Controversee pour son impact environnemental (deforestation) et nutritionnel. Autorisee dans les laits infantiles pour imiter le profil lipidique du lait maternel, mais beaucoup de marques l'ont remplacee par palme structuree ou coco. EN: Palm oil is a vegetable fat with 50 percent saturated fatty acids. Contested for environmental and nutritional reasons. Allowed in infant formula to mimic breastmilk lipid profile, but many brands now use structured palm or coconut oil instead.",
    example: "Un lait 1er age avec 'huile de palme' en 2e position : pas interdit, mais des alternatives existent (OPO palm oil ou matieres grasses laitieres).",
    internalLink: { href: "/encyclopedia/huile-de-palme", label: "Huile de palme dans les laits bebe" },
    externalSource: { url: "https://www.efsa.europa.eu/en/press/news/160503", label: "EFSA huile de palme" },
    category: "additifs",
    aliases: ["palme", "palmier a huile"],
  },
  "additif e471": {
    definition: "Mono et diglycerides d'acides gras : emulsifiant synthetique qui stabilise les textures. Autorise dans les aliments bebe sans dose maximale (quantum satis). Controverse car peut etre issu d'huile de palme et certains sous-produits pourraient perturber le microbiote intestinal (etude Nature 2015 sur emulsifiants). EN: E471 (mono- and diglycerides of fatty acids) is a synthetic emulsifier authorized in baby food without max dose. Controversial because it can be palm-derived and emerging research suggests some emulsifiers disturb gut microbiota.",
    example: "Un biscuit bebe avec 'E471' dans la liste : legal, mais on prefere une alternative sans emulsifiant (sable maison, biscuits avec juste farine + beurre + lait).",
    internalLink: { href: "/encyclopedia/e471", label: "E471 : faut-il s'inquieter" },
    externalSource: { url: "https://www.efsa.europa.eu/en/efsajournal/pub/4152", label: "EFSA E471" },
    category: "additifs",
    aliases: ["e471", "mono et diglycerides", "mono-diglycerides"],
  },
  "additif e150d": {
    definition: "Caramel au sulfite d'ammonium, colorant brun industriel. Frequent dans les sodas et certaines cereales infantiles colorees. L'EFSA a confirme sa DJA mais des etudes (notamment sur le 4-methylimidazole, sous-produit) pointent un risque cancerogene chez l'animal a haute dose. Inutile dans l'alimentation bebe. EN: E150d (sulphite ammonia caramel) is an industrial brown colorant. Found in sodas and some colored infant cereals. EFSA confirmed its ADI but animal studies on 4-MeI byproduct raise concerns. Unnecessary in baby food.",
    example: "Une boisson maltee pour enfants contient parfois E150d : zero interet nutritionnel, juste un coup d'esthetique.",
    internalLink: { href: "/encyclopedia/colorants-bebe", label: "Colorants et bebe" },
    externalSource: { url: "https://www.efsa.europa.eu/en/efsajournal/pub/2004", label: "EFSA caramels" },
    category: "additifs",
    aliases: ["e150d", "caramel e150"],
  },
  "acide citrique": {
    definition: "E330, acide organique present naturellement dans les agrumes mais majoritairement produit industriellement par fermentation (Aspergillus niger). Conservateur et acidifiant courant dans gourdes de fruits et compotes. Considere inoffensif par l'EFSA mais peut fragiliser l'email dentaire a forte exposition. EN: E330 (citric acid) occurs naturally in citrus but is mostly industrially fermented. Common acidifier and preservative in fruit pouches. EFSA deems it safe but high exposure can erode tooth enamel.",
    example: "Une compote industrielle qui contient E330 : pas un drapeau rouge en soi, mais on surveille la frequence et les dents qui poussent.",
    internalLink: { href: "/encyclopedia/e330", label: "E330 dans les produits bebe" },
    externalSource: { url: "https://www.efsa.europa.eu/en/efsajournal/pub/4645", label: "EFSA E330" },
    category: "additifs",
    aliases: ["e330", "citrate"],
  },
  "carraghenane": {
    definition: "E407, gelifiant extrait d'algues rouges. Interdit dans les preparations pour nourrissons de moins de 16 semaines (Directive 2006/141/CE) car il peut provoquer des inflammations intestinales chez les bebes. Autorise au-dela mais evite par les meilleures marques. EN: E407 (carrageenan) is a red-seaweed gelling agent. Banned in infant formula for under-16-week-old babies (EU Directive 2006/141) due to inflammatory risk. Allowed beyond but avoided by the best brands.",
    example: "Un dessert lacte bebe avec 'carraghenane' : on prefere largement un yaourt nature sans gelifiants.",
    internalLink: { href: "/encyclopedia/e407", label: "Carraghenane bebe" },
    externalSource: { url: "https://www.efsa.europa.eu/en/efsajournal/pub/5238", label: "EFSA E407" },
    category: "additifs",
    aliases: ["e407", "carraghenanes"],
  },
  "lecithine": {
    definition: "E322, emulsifiant naturel extrait du soja (le plus souvent) ou du tournesol. Permet de melanger eau et matieres grasses. Consideree inoffensive par l'EFSA. Dans un lait infantile ou un biscuit, lecithine = neutre (contrairement aux emulsifiants synthetiques E471/E472). EN: E322 (lecithin) is a natural emulsifier mostly from soy or sunflower. Blends water and fats. EFSA confirms safety. In infant milk or biscuits, lecithin is neutral (unlike synthetic emulsifiers).",
    example: "Un lait infantile avec 'lecithine de tournesol' en fin de liste : aucun drapeau rouge.",
    internalLink: { href: "/encyclopedia/e322", label: "Lecithine bebe" },
    externalSource: { url: "https://www.efsa.europa.eu/en/efsajournal/pub/4742", label: "EFSA E322" },
    category: "additifs",
    aliases: ["e322", "lecithine de soja", "lecithine de tournesol"],
  },

  // ==========================================================================
  // CATEGORIE : LABELS (bio, qualite, certifications)
  // ==========================================================================
  "demeter": {
    definition: "Label biodynamique international, le plus exigeant en agriculture bio. Va au-dela du cahier des charges AB : rotation des cultures, preparations biodynamiques, respect des cycles lunaires. Sur un produit bebe, Demeter = top de la sincerite bio + qualite nutritionnelle plus elevee (etudes INRA 2014). EN: Demeter is the strictest international biodynamic certification, beyond organic AB : crop rotation, biodynamic preparations, lunar cycles respect. On baby food, Demeter signals top-tier organic sincerity and higher nutritional quality.",
    example: "Un petit pot Holle ou Lemke portant Demeter : bio pousse au maximum, traces de pesticides quasi indetectables.",
    internalLink: { href: "/products/bio", label: "Top produits bio bebe" },
    externalSource: { url: "https://www.demeter.fr/", label: "Demeter France" },
    category: "labels",
    aliases: ["label demeter", "biodynamie"],
  },
  "ab bio": {
    definition: "Label Agriculture Biologique francais (AB), aligne sur le reglement europeen bio. Interdit les pesticides et engrais de synthese, limite 47 additifs autorises sur plus de 300 conventionnels. Minimum 95% d'ingredients bio. Sur un produit bebe : un bon point, mais ne dit rien sur le sucre ajoute ou la qualite de transformation. EN: The French AB label aligns with EU organic regulation : bans synthetic pesticides, limits additives (47 allowed vs 300 conventional), requires 95 percent organic ingredients. Good on baby food, but doesn't address added sugar or processing level.",
    example: "Une gourde bio AB peut quand meme contenir du sucre de canne bio ajoute : bio ne signifie pas sain par defaut.",
    internalLink: { href: "/products/bio", label: "Classement bio bebe" },
    externalSource: { url: "https://www.agencebio.org/", label: "Agence Bio" },
    category: "labels",
    aliases: ["agriculture biologique", "label ab", "bio france"],
  },
  "eu bio": {
    definition: "Euro-feuille verte, logo obligatoire sur tous les produits bio vendus dans l'UE depuis 2010. Regles identiques pour tous les pays membres (reglement 2018/848). Sur un produit bebe : meme niveau que l'AB francais (ils sont equivalents). EN: The EU green leaf is the mandatory EU organic logo since 2010. Rules are harmonized across member states (Regulation 2018/848). On baby food, equivalent to the French AB label.",
    example: "Un lait infantile allemand vendu en France portera l'Eurofeuille et souvent AB en co-label : les deux signifient la meme chose.",
    internalLink: { href: "/products/bio", label: "Bio europeen et bebe" },
    externalSource: { url: "https://eur-lex.europa.eu/eli/reg/2018/848/oj", label: "Reglement UE 2018/848" },
    category: "labels",
    aliases: ["eurofeuille", "euro feuille", "bio europeen", "ecolabel bio"],
  },

  // ==========================================================================
  // CATEGORIE : NUTRITION COMPORTEMENTALE
  // ==========================================================================
  "sucre ajoute": {
    definition: "Tout sucre ajoute lors de la fabrication (saccharose, sirop de glucose, fructose, concentre de jus de fruits, maltodextrine...) qui n'est pas naturellement present dans l'ingredient de base. L'OMS et l'ANSES recommandent zero sucre ajoute avant 2 ans. EN: Added sugar is any sweetener added during manufacturing (sucrose, glucose syrup, fructose, fruit juice concentrate, maltodextrin) not naturally present in base ingredients. WHO and ANSES both recommend zero added sugar before age 2.",
    example: "Une compote 'pomme + concentre de pomme' contient du sucre ajoute deguise : le concentre est pur sucre, pas du fruit entier.",
    internalLink: { href: "/encyclopedia/sucres-caches", label: "Reperer les sucres caches" },
    externalSource: { url: "https://www.who.int/news/item/04-03-2015-who-calls-on-countries-to-reduce-sugars-intake-among-adults-and-children", label: "OMS sucres" },
    category: "nutrition",
    aliases: ["sucres ajoutes", "sucre cache", "sucres caches"],
  },

  // ==========================================================================
  // CATEGORIE : ALLERGENES
  // ==========================================================================
  "allergene": {
    definition: "Substance qui declenche une reaction immunitaire anormale. 14 allergenes majeurs obligatoirement declares en Europe (Reglement 1169/2011) : gluten, crustaces, oeufs, poisson, arachides, soja, lait, fruits a coque, celeri, moutarde, sesame, sulfites, lupin, mollusques. Les pediatres recommandent desormais de les introduire tot (4-6 mois) pour reduire les risques d'allergie. EN: An allergen is a substance triggering an abnormal immune response. EU Regulation 1169/2011 mandates declaring 14 major allergens. Pediatricians now recommend early introduction (4-6 months) to reduce allergy risk.",
    example: "Un biscuit bebe contient 'blé, oeufs, lait' : trois allergenes majeurs a integrer progressivement avec prudence la premiere fois.",
    internalLink: { href: "/encyclopedia/allergenes-bebe", label: "Allergenes : quand introduire" },
    externalSource: { url: "https://www.economie.gouv.fr/dgccrf/allergenes-alimentaires", label: "DGCCRF allergenes" },
    category: "allergenes",
    aliases: ["allergenes", "allergene alimentaire"],
  },
  "traces allergenes": {
    definition: "Mention 'peut contenir des traces de...' qui signale un risque de contamination croisee dans l'usine (meme ligne de production que d'autres produits avec allergenes). N'est pas legalement obligatoire mais protege le fabricant. Pour un bebe avec allergie confirmee : a eviter. EN: The 'may contain traces of' disclaimer flags possible cross-contamination on shared production lines. Not legally mandatory but protects the manufacturer. For confirmed-allergy babies, avoid these products.",
    example: "Un biscuit bebe sans oeuf mais 'peut contenir des traces d'oeuf' : safe pour un bebe normal, a eviter pour un bebe allergique a l'oeuf.",
    internalLink: { href: "/encyclopedia/allergenes-bebe", label: "Traces et contamination croisee" },
    externalSource: { url: "https://www.anses.fr/fr/content/allergies-alimentaires", label: "ANSES allergies" },
    category: "allergenes",
    aliases: ["peut contenir des traces", "contamination croisee"],
  },

  // ==========================================================================
  // CATEGORIE : SECURITE
  // ==========================================================================
  "botulisme infantile": {
    definition: "Infection rare mais grave provoquee par la toxine de Clostridium botulinum, bacterie qui colonise l'intestin des bebes de moins d'1 an (microbiote encore immature). Principale source : miel. C'est pourquoi on interdit le miel avant 12 mois. Symptomes : constipation, hypotonie, difficulte a teter. EN: Infant botulism is a rare but serious infection caused by Clostridium botulinum toxin in babies under 1 year (immature gut flora). Main source : honey. Honey is therefore banned before 12 months. Symptoms include constipation, hypotonia, poor feeding.",
    example: "Un bebe de 8 mois ne doit jamais manger de miel, meme une cuillere 'pour la toux'. Les parents ignorent souvent cette regle : 20% des cas francais viennent de miel donne trop tot.",
    internalLink: { href: "/blog", label: "Les aliments interdits avant 1 an" },
    externalSource: { url: "https://www.anses.fr/fr/content/botulisme-infantile", label: "ANSES botulisme" },
    category: "securite",
    aliases: ["botulisme", "clostridium botulinum"],
  },

  // ==========================================================================
  // CATEGORIE : MICROBIOTE
  // ==========================================================================
  "microbiote": {
    definition: "Ecosysteme de milliards de bacteries qui vivent dans l'intestin. Se construit de la naissance a 3 ans, influence durablement immunite, digestion, risque d'allergies. Allaitement, naissance par voie basse et diversification variee favorisent un microbiote riche. EN: The microbiome is the ecosystem of billions of gut bacteria. It develops from birth to age 3 and shapes lifelong immunity, digestion, and allergy risk. Breastfeeding, vaginal delivery, and a varied diet build a richer microbiome.",
    example: "Un bebe allaite avec une diversification variee (legumes, fibres, cereales complete) a un microbiote plus diversifie qu'un bebe biberon nourri uniquement aux compotes industrielles.",
    internalLink: { href: "/blog", label: "Microbiote bebe : les bases" },
    externalSource: { url: "https://www.inserm.fr/dossier/microbiote-intestinal-flore-intestinale/", label: "Inserm microbiote" },
    category: "nutrition",
    aliases: ["flore intestinale", "microbiome"],
  },
  "prebiotique": {
    definition: "Fibre alimentaire non digestible (type GOS, FOS, inuline) qui nourrit les bonnes bacteries du microbiote intestinal. Naturellement presente dans le lait maternel (HMO). Ajoutee dans certains laits infantiles pour rapprocher leur effet du lait maternel. EN: Prebiotics are non-digestible fibres (GOS, FOS, inulin) feeding good gut bacteria. Naturally present in breastmilk (HMO). Added to some infant formulas to mimic breastmilk's effect.",
    example: "Un lait 1er age qui mentionne 'GOS/FOS' ou 'HMO' : il imite la composition prebiotique du lait maternel.",
    internalLink: { href: "/encyclopedia/prebiotiques", label: "Prebiotiques dans les laits" },
    externalSource: { url: "https://www.efsa.europa.eu/en/topics/topic/dietary-reference-values", label: "EFSA DRV" },
    category: "nutrition",
    aliases: ["prebiotiques", "gos", "fos", "hmo"],
  },
  "probiotique": {
    definition: "Micro-organismes vivants (souvent Bifidobacterium, Lactobacillus) qui apportent un benefice sante quand consommes en quantite suffisante. Peu de preuves solides de benefice dans les laits infantiles standards selon l'ESPGHAN 2023, meme si plusieurs marques en ajoutent. EN: Probiotics are live microorganisms (Bifidobacterium, Lactobacillus) delivering health benefits at adequate doses. ESPGHAN 2023 finds limited evidence for benefits in standard infant formula despite their frequent addition.",
    example: "Un lait infantile avec 'Bifidus BL' : probable effet marginal positif sur le transit, pas un deal-breaker dans ton choix.",
    internalLink: { href: "/encyclopedia/probiotiques", label: "Probiotiques bebe" },
    externalSource: { url: "https://www.espghan.org/knowledge-center", label: "ESPGHAN probiotiques" },
    category: "nutrition",
    aliases: ["probiotiques", "bifidus", "lactobacillus"],
  },
};

// Index par aliases pour resolution rapide cote composant
export const glossaireAliases: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const [key, entry] of Object.entries(glossaire)) {
    map[key] = key;
    if (entry.aliases) {
      for (const alias of entry.aliases) map[alias.toLowerCase()] = key;
    }
  }
  return map;
})();

export function resolveGlossaireKey(input: string): string | null {
  const k = input.toLowerCase().trim();
  return glossaireAliases[k] ?? null;
}

export const glossaireCategories: Array<{ id: GlossaireEntry["category"]; label: string; description: string }> = [
  { id: "nutrition", label: "Nutrition et classifications", description: "Les reperes officiels, scores et comportements alimentaires a connaitre pour decoder les produits bebe." },
  { id: "additifs", label: "Additifs et ingredients industriels", description: "Les E, emulsifiants, sucres caches et graisses que l'on croise le plus souvent sur les etiquettes." },
  { id: "labels", label: "Labels et certifications", description: "AB, EU Bio, Demeter : ce que chaque logo garantit vraiment (ou pas)." },
  { id: "allergenes", label: "Allergies et allergenes", description: "Les 14 allergenes obligatoires, l'APLV et les strategies d'introduction recommandees par les pediatres." },
  { id: "laits", label: "Laits infantiles", description: "1er age, 2e age, croissance : la regulation stricte qui encadre chaque etape." },
  { id: "securite", label: "Securite alimentaire", description: "Rappels produits, contaminants et risques specifiques aux bebes (botulisme, metaux lourds)." },
];
