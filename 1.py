# 导入CSV模块（Python内置，无需额外安装）
import csv

# 整理后的完整单词/短语列表
words_list = [
    # 第一组
    "apartment", "faddism", "astronomical", "goggle", "fetishism",
    "compromise", "vein", "alternative", "contemporary", "niggle",
    "apnea", "consequently", "rumble", "fellow", "intensively",
    "bleach", "expedition",
    # 第二组
    "anthropogenic", "salvage", "aggregate", "reduce", "abandoned",
    "punctual", "comprise", "snout", "monograph", "genetical",
    "igneous", "tiff", "bracket", "rigor", "barge",
    "dissertation", "reminder", "accusation",
    # 第三组
    "fallow", "grander", "crumb", "liner", "sightseeing",
    "jagged", "stout", "pull up", "flutter", "monopoly",
    "diversion", "syllabus", "consequent", "smudge", "demographic",
    "according", "dodge", "ferment", "conductive", "extraordinary",
    "breadth", "inundate",
    # 第四组
    "theological", "category", "pipe", "exterior", "sleigh",
    "stopgap", "shelter", "rumple", "democratic", "bathe",
    "due", "anthropomorphism", "ethnic", "ratify", "drift",
    "come up", "ground floor", "repose", "metaphysical", "sentiment",
    "marital",
    # 第五组
    "dialect", "electoral", "assemble", "candida", "extant",
    "whether", "pliable", "crowd", "besides", "groggy",
    "habituation", "constitute", "jurisdiction", "lure", "crumble",
    "bellow", "paltry", "dispensable", "literate", "college",
    "perverted", "repatriate", "slant",
    # 第六组
    "calligraphy", "multiply", "virtuous", "fabricate", "astrological",
    "as of", "slum", "concur", "perquisite", "savage",
    "bombing", "ethic", "descent", "hang on", "integrated",
    "disposable", "visually", "cyclist", "inferior", "gut",
    # 第七组
    "intense", "campsite", "blunder", "clamour", "injury",
    "originally", "renounce", "abstinence", "seismograph", "larva",
    "bound", "acclaim", "perceptive", "suit", "overdraft",
    "living habit", "alternatively", "convex", "statute", "involvement",
    "gobble",
    # 第八组
    "impeach", "stipulate", "The Guardian", "pervert", "coffin",
    "trample", "spatter", "morph", "smile", "premiere",
    "slap", "repeal", "production", "catastrophic", "inflationary",
    "diving", "dub", "bogus", "brave", "dummy",
    "usage", "haven",
    # 第九组
    "painting", "international departure", "postulate", "insignificant", "canyon",
    "remainder", "justifiable", "voice recorder", "evacuation", "hilarious",
    "fauna", "extradition", "stiff", "stamen", "accredit",
    "whisker", "slaughter", "suffragette", "maniac", "bombard",
    "intensive",
    # 第十组
    "analog", "champion", "shutter", "alternate", "bowel",
    "telecommuting", "candid", "temporary", "Ms.", "inexorable",
    "grill", "trail", "guild", "lodge", "congregate",
    "breath", "earthenware", "abduct", "endangered", "perimeter",
    # 第十一组
    "outing", "seismology", "undertaken", "fortuitous", "mural",
    "quite", "shackle", "veracious", "clam", "institutional",
    "hustle", "greatly", "distinguished", "irrespectively", "consultant",
    "jungle", "stun", "counterpart", "metamorphic", "perverse",
    # 第十二组
    "precipitate", "phrase", "antiseptic", "propriety", "modification",
    "prosperous", "nova", "liveliness", "bawl", "fructification",
    "fur seal", "illustrious", "hood", "undistinguished", "extraction",
    "anaesthetic", "pipet", "sweat", "particular", "bale",
    # 第十三组
    "distinguishing", "despoil", "animation", "vitality", "temple",
    "strip", "embassy", "waken", "rode", "unlike",
    "babysit", "truancy", "creation", "quandary", "junction",
    "booklet", "critter", "abundant", "strive", "prison",
    "retort", "girdle", "fervent",
    # 第十四组
    "grab", "spear", "manioc", "anonym", "shear",
    "embezzle", "surrounding", "memorandum", "drastic", "constituent",
    "candidate", "trolley", "trapping", "pollinate", "solicitous",
    "cheers", "industrious", "tenuous", "snag", "ahead of",
    "cellphone",
    # 第十五组
    "depreciation", "mediate", "compartment", "studious", "decorous",
    "look forward to", "bowl", "brilliant", "catch a flick", "vigorously",
    "analogue", "offender", "stationery", "hanger", "decent",
    "dining", "clean", "personnel", "quarterback", "sole",
    "cinematograph", "rodent", "bath", "waggle",
    # 第十六组
    "independence", "convention", "telephone", "dairy", "construction",
    "quarter", "iron", "telling", "baffle", "inextricably",
    "boarding", "denounce", "grateful", "beard", "hound",
    "inset", "fanaticism", "pupil",
    # 第十七组
    "snap", "momentous", "tick", "oust", "pedal",
    "aesthetics", "sensor", "swam", "census", "greet",
    "classic", "desperate", "ineligible", "eclipse", "cursory",
    "fester", "formulate", "butt", "orthopaedic", "insect",
    "congenial",
    # 第十八组
    "drought", "entrepreneur", "evolutionary", "socialite", "softy",
    "equity", "haze", "bear in mind", "misconception", "ferret",
    "intestine", "involuntary", "economic", "improper", "mainstream",
    "meditate", "lunar", "invest", "garlic", "fierce",
    "humiliate", "greed", "postmen", "microscopic", "indignant",
    "ingest", "metabolism", "inflate", "natural resource", "legacy",
    "inventory", "magnify", "automobile", "materialistic", "heroic",
    "greatly", "lifeline", "hiccup", "hoarse", "hundredth",
    "ideally", "ridge", "playground", "despise", "biology",
    "rubbish", "vet", "scope"
]

# 将单词写入exclude.csv文件
with open("exclude.csv", "w", newline="", encoding="utf-8") as csvfile:
    # 创建CSV写入器
    writer = csv.writer(csvfile)
    # 逐行写入每个单词（单列CSV格式）
    for word in words_list:
        writer.writerow([word])

print("✅ exclude.csv 文件已生成，共包含 {} 个单词/短语".format(len(words_list)))