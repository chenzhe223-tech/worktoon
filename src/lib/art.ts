export interface ArtStyle {
  id: string
  name: string
  desc: string
  /** 视觉定位：这一风格的身份，参与生成 */
  identity: string
  palette: string
  line: string
  light: string
  comp: string
  /** 镜头节奏偏好 */
  camera: string
  /** 专属生成提示词（英文，喂给画面模型） */
  prompt: string
  /** 该风格专属的排除项 */
  avoid: string
  /** 夸张程度 */
  exaggeration: string
  motif: string
  c: { bg: string; ink: string; a1: string; a2: string }
}

/* ============================================================
 * 公共漫画质量基准 COMIC_QUALITY_BASE
 * 12 种画风共用，与「画风专属规范」组合后一起下发
 * ============================================================ */

export const COMIC_QUALITY_BASE = {
  positive:
    'Create a polished, professionally art-directed comic illustration with intentional composition, clear visual hierarchy, expressive character design, coherent lighting, refined color relationships, and carefully controlled environmental details. ' +
    'Every panel must communicate a specific story beat through character action, facial expression, body language, camera framing, and relevant environmental details. ' +
    'Use deliberate foreground, middle-ground, and background separation where appropriate. Give important objects convincing shape, material, and visual weight. Keep the main subject immediately recognizable. ' +
    'The result must look like a finished page from a professionally illustrated comic, not a rough storyboard, generic clip-art illustration, unfinished vector drawing, or random collection of decorative elements. ' +
    'Maintain the selected art direction consistently across the entire comic. All panels must share the same visual language, character design principles, line quality, rendering approach, and color logic. ' +
    'Use visual exaggeration only when it supports the selected genre and the actual story.',
  negatives: [
    'unfinished sketch',
    'crude stick figures',
    'generic icon-like characters',
    'simplistic geometric people without intentional art direction',
    'empty or unfinished environments',
    'random decorative shapes',
    'inconsistent character proportions',
    'inconsistent facial features',
    'inconsistent clothing',
    'inconsistent rendering techniques',
    'arbitrary changes of art style',
    'unrelated fantasy objects',
    'meaningless cinematic spectacle',
    'accidental text or watermarks',
    'malformed anatomy',
    'unnecessary visual clutter',
    'flat lifeless compositions',
    'repeated identical camera framing',
  ],
  /** 人物造型底线：所有风格共用，防止出现简陋矢量小人 */
  character:
    'Design the character as a fully designed figure, not a symbol: distinct face shape, believable facial features, designed hairstyle with volume, clothing with silhouette and folds, natural posture, readable hands and gestures, and a clear facial expression that matches the story beat. The character must occupy a clear visual focus in the frame.',
  /** 背景底线：所有风格共用，防止空洞背景 */
  environment:
    'Build a designed environment with foreground, middle-ground and background. Background details must come from the actual work context: office window, desk, computer, documents, shelves, meeting table, lamps, plants, stationery, city view or work tools. Keep hierarchy clear: subject sharpest, key props next, background simplified but present. Never fill emptiness with random stars, hearts, sparkles or decorative gradients.',
  /** 真实性底线 */
  truthfulness:
    'Every depicted element must correspond to an actual event, action, object or emotion from the real work log. Do not invent outcomes that were not recorded, such as a supplier accepting a price cut, a signed contract, or saved budget. Prefer literal depiction; use metaphor only when the metaphor stays readable and clearly maps back to the real task.',
}

export const ART_STYLES: ArtStyle[] = [
  {
    id: 'jp_healing',
    name: '日系治愈手绘风',
    desc: '温柔的日常感，像午后阳光下的水彩手账',
    identity: '温暖、细腻、自然、有生活感的手绘动画电影式漫画，重视环境描绘与自然光影',
    palette: '奶白、柔和鼠尾草绿、天蓝、柔和赭石、克制的珊瑚点缀',
    line: '细腻有机的手绘勾线，粗细自然变化，边缘略带手绘温度',
    light: '柔和环境光，窗光与反光，自然投影，轻微光晕',
    comp: '电影式取景，前中后景分层，留白服务于情绪',
    camera: '环境远景 → 对话中景 → 情绪近景 → 有意义的物件细节，交替推进',
    prompt:
      'Create a beautifully hand-drawn Japanese-inspired slice-of-life comic illustration with delicate organic linework, natural color transitions, warm ambient lighting, refined character expressions, and richly observed everyday environments. ' +
      'Use a harmonious palette of warm ivory, muted sage green, sky blue, soft ochre, and restrained coral accents. Apply subtle paper-like texture and carefully layered environmental details. ' +
      'Design characters with distinctive facial features, natural body proportions, carefully shaped hairstyles, believable clothing folds, and expressive but restrained gestures. ' +
      'Use sunlight through office windows, soft reflected light, natural shadows, plants, stationery, furniture, and small environmental details to create depth and atmosphere. ' +
      'Frame each scene like a carefully composed moment from an animated feature film. Alternate environmental wide shots, conversational medium shots, intimate close-ups, and meaningful object details. ' +
      'For humorous scenes, use gentle exaggeration, expressive eyes, subtle body language, and visual contrast. For emotional scenes, use quiet composition and natural lighting.',
    avoid:
      'Avoid simplistic flat-vector characters, empty backgrounds, childish sticker aesthetics, plastic-looking surfaces, excessive outlines, and random decorative elements.',
    exaggeration: '温和克制；幽默处靠眼神与肢体，情绪处靠安静构图',
    motif: 'healing',
    c: { bg: '#FDF3E3', ink: '#6B4F3A', a1: '#EFAE7A', a2: '#A8C3A0' },
  },
  {
    id: 'us_western',
    name: '美国西部漫画风',
    desc: '粗犷的荒野叙事，硬朗线条与大色块',
    identity: '硬朗、粗犷、具有西部冒险与经典美式图像小说气质，强调力量感、强对比和戏剧性动作',
    palette: '焦赭、尘沙、暖棕、暗锈红、炭黑、克制的奶油高光',
    line: '自信的墨色轮廓，块面分明，材质带明确纹理',
    light: '强烈方向性日光，深而可读的阴影，空气透视',
    comp: '广角环境构图，必要时低视角英雄取景，过肩与对角线动作构图',
    camera: '广角环境远景 → 过肩中景 → 决定性近景 → 动作对角构图',
    prompt:
      'Create a professionally illustrated American Western-inspired graphic comic with confident ink contours, bold shadow shapes, expressive character silhouettes, textured environmental surfaces, and cinematic frontier-inspired compositions. ' +
      'Use a controlled palette of burnt ochre, dusty sand, warm brown, muted rust red, charcoal, and restrained cream highlights. ' +
      'Render clothing, wood, metal, paper, and environmental surfaces with intentional texture and clear material differences. Use strong directional sunlight, deep but readable shadows, and atmospheric perspective. ' +
      'Characters must have distinct facial structures, believable body proportions, carefully designed clothing, and readable poses. ' +
      'Use wide environmental compositions, low-angle hero framing when justified, over-the-shoulder views, dramatic close-ups, and diagonal action compositions. ' +
      'Translate workplace challenges into the visual language of a frontier expedition or a tense negotiation only when the metaphor remains clear.',
    avoid:
      'Avoid random weapons, unnecessary violence, generic cowboy costumes, excessive dirt textures, repetitive aggressive poses, and disconnected Western props in ordinary scenes.',
    exaggeration: '力量感与戏剧性，但不把普通办公场景变成枪战',
    motif: 'western',
    c: { bg: '#F3D9B1', ink: '#3A2A20', a1: '#C4593C', a2: '#4E6E8E' },
  },
  {
    id: 'cn_ink',
    name: '中国古典水墨风',
    desc: '留白与墨韵，一笔一划都有呼吸',
    identity: '高级东方美学，强调笔墨、留白、气韵、空间层次与诗意叙事，而非黑白剪影',
    palette: '墨黑、宣纸暖米、烟灰、靛青、克制的朱砂或哑金',
    line: '有意为之的用笔，讲究墨色浓淡、飞白与墨韵扩散',
    light: '无硬光源，靠墨色浓淡与层次雾气表现空间',
    comp: '不对称构图，远景层叠，前景枝干或建筑框景，留白均衡',
    camera: '远景山水层 → 中景人物 → 近景神情 → 留白收束',
    prompt:
      'Create an elegant Chinese ink-wash comic illustration inspired by traditional brush painting and refined contemporary visual storytelling. ' +
      'Use deliberate brushwork, nuanced ink density, dry-brush textures, controlled ink diffusion, layered mist, and intentional negative space. ' +
      'Build the palette around ink black, warm rice-paper ivory, smoky gray, indigo, and restrained cinnabar red or muted gold accents. ' +
      'Characters must remain recognizable and clearly designed, with expressive faces, readable gestures, and controlled silhouette shapes. ' +
      'Use asymmetrical composition, distant landscape layers, foreground branches or architectural elements, mist, and carefully balanced empty space. ' +
      'Integrate classical visual metaphors into modern workplace scenes only when they help communicate the actual event. A difficult project may resemble a mountain pass; a complex decision may resemble a chessboard; a resolved problem may be represented by clearing mist. ' +
      'Preserve sufficient contrast and detail for mobile viewing. The main action must remain immediately understandable.',
    avoid:
      'Avoid empty white pages with tiny figures, indistinct ink silhouettes, uncontrolled bleeding, illegible faces, random classical ornaments, and arbitrary mixtures of ancient and modern settings.',
    exaggeration: '以意象与留白传情，不做夸张形变',
    motif: 'inkwash',
    c: { bg: '#F6F1E6', ink: '#2C2A28', a1: '#8C8C86', a2: '#B4472F' },
  },
  {
    id: 'cyber',
    name: '现代科技赛博风',
    desc: '精密的未来感与数据可视化，不是廉价霓虹堆砌',
    identity: '精密、未来感、成熟科幻图像小说质感，避免廉价霓虹与随机界面堆叠',
    palette: '深海军蓝、石墨、电光青、克制的紫、有限的品红点缀',
    line: '精密线稿，硬边几何，层次分明的未来结构',
    light: '电影式轮廓光，方向明确的光源，反射与景深分离',
    comp: '透视驱动构图，前景框景，选择性近景，层次纵深',
    camera: '透视远景 → 工作站中景 → 界面特写 → 人物近景收束',
    prompt:
      'Create a sophisticated cyberpunk-inspired technology comic with precise linework, layered futuristic environments, cinematic rim lighting, structured holographic interfaces, and strong depth separation. ' +
      'Use deep navy, graphite, electric cyan, restrained violet, and limited magenta accents. Ensure the palette remains controlled and readable. ' +
      'Design technological elements as coherent functional objects: transparent displays, data visualization panels, futuristic workstations, robotic tools, and digital environments. ' +
      'Characters must remain the visual anchor. Give them refined facial features, believable clothing, clear silhouettes, and expressive gestures. ' +
      'Use perspective-driven compositions, reflections, foreground framing, selective close-ups, and deliberate light sources. ' +
      'Translate AI-assisted work or data analysis into visual metaphors such as organized information streams, unfolding data layers, or a problem-solving interface.',
    avoid:
      'Avoid making every object glow. Do not fill the scene with random code, meaningless HUD elements, unreadable interface text, excessive neon, or unrelated futuristic machinery.',
    exaggeration: '克制的科技夸张，服务数据与分析主题',
    motif: 'cyber',
    c: { bg: '#141A2B', ink: '#0B0F18', a1: '#38E1E1', a2: '#F258A6' },
  },
  {
    id: 'eu_novel',
    name: '欧洲经典图像小说风',
    desc: '克制的写实，像一本沉稳的成人绘本',
    identity: '精确线稿、清晰色块、成熟的场景设计与具有出版物质感的连续叙事',
    palette: ' muted teal、暖赭、砖红、奶油、石板蓝、克制的深色轮廓',
    line: '精炼墨线轮廓，选择性阴影块面，轻微材质纹理',
    light: '自然顶光，柔和过渡，空气感强',
    comp: '清晰的环境建立镜头、对话中景、有意义的近景与物件细节',
    camera: '环境建立远景 → 对话中景 → 表情近景 → 物件细节',
    prompt:
      'Create a polished European graphic-novel illustration with precise contour drawing, deliberate architectural detail, balanced color blocks, expressive character design, and clear narrative staging. ' +
      'Use a sophisticated palette of muted teal, warm ochre, brick red, cream, slate blue, and carefully controlled dark outlines. ' +
      'Design people, furniture, streets, offices, and buildings with coherent geometry and believable spatial relationships. ' +
      'Use refined ink contours, selective shadow shapes, subtle material textures, and consistent character proportions. ' +
      'Compose scenes with clear environmental establishing shots, conversational medium shots, meaningful close-ups, and deliberate object details. ' +
      'Background details should enrich the story without competing with the characters. ' +
      'Use visual humor through subtle environmental details, expressive body language, and the contrast between what characters do and how they react.',
    avoid:
      'Avoid rough sketch aesthetics, photographic realism mixed with cartoon figures, random texture overlays, overly simplified characters, and disconnected poster-like panels.',
    exaggeration: '靠反差与环境幽默，不做形变夸张',
    motif: 'european',
    c: { bg: '#E7E3D6', ink: '#38403C', a1: '#7C8B78', a2: '#B08A4E' },
  },
  {
    id: 'hero_action',
    name: '超级英雄动作风',
    desc: '爆发力十足，但绝不无故把工作日变战场',
    identity: '高冲击力、动态透视、鲜明轮廓与英雄式叙事，只在事件本身值得时才使用',
    palette: '深蓝、红、暖金、炭黑、奶油，强调色由场景决定',
    line: '自信的黑墨轮廓，动势明确，轮廓干净',
    light: '受控的高对比光影，戏剧性边缘光与投影',
    comp: '成就时刻低视角，紧张时刻倾斜构图，关键动作近景，重大成果用广角',
    camera: '成果低视角 → 紧张倾斜 → 决断近景 → 成果广角',
    prompt:
      'Create a dynamic superhero-inspired comic illustration with confident black ink contours, expressive action poses, dramatic perspective, controlled high-contrast lighting, and carefully designed motion. ' +
      'Use a coherent palette selected from deep blue, red, warm gold, charcoal, and cream, with color emphasis determined by the scene. ' +
      'Characters should have clear silhouettes, convincing anatomy, distinctive facial features, strong gestures, and consistent clothing design. ' +
      'Use low-angle framing for moments of achievement, tilted compositions for genuine tension, close-ups for decisive actions, and wide compositions for major results. ' +
      'Motion lines, impact shapes, and dramatic shadows must reinforce the action rather than become decorative noise. ' +
      'Represent overcoming a difficult task as a visual moment of determination or breakthrough. Maintain the actual workplace setting and the truth of the event.',
    avoid:
      'Avoid unnecessary explosions, random weapons, irrelevant costumes, repeated heroic poses, exaggerated muscles in ordinary office scenes, and cinematic spectacle without narrative purpose.',
    exaggeration: '只在真正的突破与攻坚处夸张，其余保持写实',
    motif: 'hero',
    c: { bg: '#F2E7D0', ink: '#1C1C22', a1: '#D93A33', a2: '#2C5FB3' },
  },
  {
    id: 'manga_bw',
    name: '黑白日漫风',
    desc: '纯粹的黑白灰，靠网点与线条讲故事',
    identity: '成熟日式黑白漫画的黑白层次、网点、排线、速度感与细腻情绪表现',
    palette: '纯白、纯黑、灰阶网点',
    line: '自信的墨线，线宽变化区分前景人物、重要物件与背景',
    light: '硬光，黑白块面平衡，留白让关键动作突出',
    comp: '情绪近景、互动中景、场景远景，必要时动态斜角取景',
    camera: '远景建立 → 中景互动 → 情绪特写 → 关键动作斜角',
    prompt:
      'Create a refined black-and-white manga illustration using confident ink contours, controlled screentones, deliberate cross-hatching, expressive facial features, and carefully balanced black-and-white masses. ' +
      'Use varied line weights to distinguish foreground characters, important objects, and background details. ' +
      'Preserve clear facial structures, recognizable hairstyles, natural body proportions, and consistent character design. ' +
      'Use close-ups for emotional reactions, medium shots for interaction, wide shots for scene establishment, and dynamic angled framing only when the story benefits from it. ' +
      'Screentones and motion lines must support depth, emotion, and narrative rhythm. Reserve areas of white space to let important actions stand out. ' +
      'Keep the main character readable at mobile screen size.',
    avoid:
      'Avoid crude monochrome silhouettes, excessively dark faces, indiscriminate speed lines, muddy screentones, repetitive frontal compositions, and overly simplified bodies.',
    exaggeration: '情绪与速度线夸张，造型比例保持稳定',
    motif: 'manga',
    c: { bg: '#FFFFFF', ink: '#121212', a1: '#4A4A4A', a2: '#9A9A9A' },
  },
  {
    id: 'pop_retro',
    name: '复古美式波普风',
    desc: '60 年代印刷质感，鲜艳而俏皮',
    identity: '大胆、鲜明、复古印刷质感与视觉幽默，但不杂乱，不是文字海报',
    palette: '鲜明红、芥末黄、蓝、暖奶油、炭黑，每格确立一个主导强调色',
    line: '均匀粗黑轮廓，图形化阴影，人物轮廓平滑可读',
    light: '平光，靠网点与色块表现明暗',
    comp: '大胆裁切、表情特写、有意的重复与图形化框景，焦点明确',
    camera: '表情大特写 → 动作中景 → 重复物件 → 反转近景',
    prompt:
      'Create a polished retro American pop-art comic with bold ink outlines, controlled halftone patterns, flat but carefully balanced color fields, graphic shadows, and expressive character acting. ' +
      'Use a limited palette of vivid red, mustard yellow, blue, warm cream, and charcoal. Establish one dominant accent color per panel. ' +
      'Apply halftone texture selectively to shadows, backgrounds, and secondary surfaces. Preserve smooth and readable character silhouettes. ' +
      'Use bold crops, close-up expressions, deliberate repetition, graphic framing, and strong focal points. ' +
      'Create humor through exaggerated facial reactions, visual contrast, repeated objects, and carefully staged reversals. ' +
      'Speech bubbles and all Chinese lettering must be added separately by the webpage.',
    avoid:
      'Avoid filling every surface with dots, random lettering, excessive primary colors, decorative explosions, poorly separated foreground and background, and poster layouts that fail to tell a continuous story.',
    exaggeration: '表情与反应可强烈夸张，场景保持可读',
    motif: 'pop',
    c: { bg: '#FFF6D8', ink: '#171717', a1: '#E8347C', a2: '#2FB4D8' },
  },
  {
    id: 'chibi_work',
    name: 'Q 版萌系职场风',
    desc: '大头小身的办公室日常，可爱但画面完整',
    identity: '可爱、精致、容易产生情感连接，但必须保持完整人物设计、细腻画面与丰富场景',
    palette: '暖奶油、蜜桃、柔和薄荷、灰紫、克制的 cocoa 棕',
    line: '圆润但完整，人物有发型体积、服装细节与可读的手部',
    light: '柔和体积光影，避免贴纸式扁平',
    comp: '完整职场环境 + 透视与柔和投影，表情夸张但比例统一',
    camera: '环境远景 → 表情中景 → 手部/物件特写 → 温暖收尾近景',
    prompt:
      'Create a premium chibi workplace comic with carefully designed rounded character silhouettes, distinctive faces, expressive eyes, polished clothing details, soft dimensional shading, and warm environmental storytelling. ' +
      'Use approximately 2.5 to 3.5 head-to-body proportions, adjusting them consistently across all panels. ' +
      'Choose a coordinated palette of warm cream, peach, soft mint, dusty lavender, and restrained cocoa brown. ' +
      'Give each character a recognizable hairstyle, face shape, outfit, accessories, and signature expression. ' +
      'Design complete workplace environments with desks, computers, stationery, shelves, windows, plants, and relevant props. Use perspective and soft shadows to avoid a flat sticker-like appearance. ' +
      'Use exaggerated reactions, tiny physical gestures, personified task objects, and humorous visual metaphors. ' +
      'Keep characters adorable but visually polished, with readable hands, believable poses, and consistent proportions.',
    avoid:
      'Avoid basic circular heads with line bodies, random emoji decorations, empty backgrounds, overly childish simplification, inconsistent hairstyles, and generic clip-art aesthetics.',
    exaggeration: '比例可爱化（2.5~3.5 头身），但造型细节不简化',
    motif: 'chibi',
    c: { bg: '#FFF1F4', ink: '#5B4A52', a1: '#F5A3B8', a2: '#8FD6CF' },
  },
  {
    id: 'magazine',
    name: '现代杂志插画风',
    desc: '编辑级配图，简洁而有设计感',
    identity: '成熟、精致、现代，具有高品质编辑插画与设计出版物的审美',
    palette: '暖象牙、 muted 橙、深海军蓝、鼠尾草、陶土红与中性互补色',
    line: '精确形状，几何与有机结合，选择性材质纹理',
    light: '柔和层次光影，造型有体积感而非纯平涂',
    comp: '不对称版面，精心布置的焦点，层次化环境',
    camera: '概念远景 → 人物中景 → 物件特写 → 收束近景',
    prompt:
      'Create a premium contemporary editorial comic illustration with sophisticated art direction, precise shapes, elegant negative space, controlled textures, and carefully balanced geometric composition. ' +
      'Use a restrained palette of warm ivory, muted orange, deep navy, sage, clay red, and complementary neutral tones. ' +
      'Characters should have distinctive silhouettes, natural proportions, refined clothing details, clear facial expressions, and intentional gestures. ' +
      'Combine geometric structures with organic details. Use asymmetrical layouts, carefully positioned focal points, layered environments, and selective material textures. ' +
      'The illustration must remain narrative-driven: every scene needs a character action, a meaningful object, or an emotional change. ' +
      'Use conceptual metaphors to communicate complicated workplace situations, but ensure the visual meaning remains understandable.',
    avoid:
      'Avoid generic corporate stock illustration, lifeless geometric people, random abstract shapes, empty backgrounds, overly flat rendering, and static poster compositions without narrative progression.',
    exaggeration: '概念化隐喻，形体保持克制',
    motif: 'magazine',
    c: { bg: '#F7F3EA', ink: '#2F3A34', a1: '#C98A3E', a2: '#7E9B7A' },
  },
  {
    id: 'cn_modern',
    name: '中国现代国漫风',
    desc: '东方审美与现代分镜融合，流畅有力',
    identity: '鲜明、流畅、东方审美与现代漫画叙事融合，重视角色、场景与色彩的一致性',
    palette: '暖琥珀、 muted 青玉、深蓝、月白、克制的红点缀',
    line: '流畅的数码勾线，粗细变化干净利落',
    light: '冷暖对比光，边缘光明确，氛围纵深',
    comp: '清晰空间透视，前景框景，景别变化明确',
    camera: '环境远景 → 人物全景 → 互动中景 → 情绪近景',
    prompt:
      'Create a refined contemporary Chinese manhua-inspired comic with expressive character acting, fluid linework, nuanced color rendering, coherent lighting, and cinematic but readable compositions. ' +
      'Use a carefully balanced palette inspired by modern urban environments, with warm amber, muted jade, deep blue, cream, and restrained red accents where appropriate. ' +
      'Design characters with distinctive facial features, stable hairstyles, consistent clothing, believable body proportions, and natural hand gestures. ' +
      'Create complete modern workplace environments with realistic furniture geometry, screens, documents, lighting, and meaningful background objects. ' +
      'Use clear spatial perspective, foreground framing, atmospheric depth, and varied camera distances. ' +
      'Allow expressive exaggeration and dynamic poses while preserving the realism of the underlying work event. ' +
      'Integrate Eastern color sensibilities into modern scenes naturally. Do not insert historical clothing, traditional architecture, fantasy weapons, or ancient symbols unless the user explicitly selects a suitable fantasy interpretation.',
    avoid:
      'Avoid inconsistent faces, overdecorated costumes, uncontrolled saturation, generic vector people, random fantasy effects, and unrelated cinematic spectacle.',
    exaggeration: '动作与情绪可夸张，工作事实保持真实',
    motif: 'guoman',
    c: { bg: '#FBF7F0', ink: '#232A38', a1: '#C0392B', a2: '#3D6FA8' },
  },
  {
    id: 'noir',
    name: '黑色电影悬疑风',
    desc: '阴影里的故事，一束光就够了',
    identity: '电影化、成熟、具有调查与推理氛围，重点是视觉线索与叙事节奏，而不是无意义的黑暗',
    palette: '黑、炭灰、暖灰、 muted 奶油，琥珀或暗红作为唯一克制强调色',
    line: '硬边阴影切割，形体在明暗中断续可读',
    light: '受控的明暗对照，方向明确的光源，窗影与台灯光',
    comp: '远景建立环境，中景推进调查，近景锁定线索与文件细节',
    camera: '走廊/办公室远景 → 调查中景 → 线索特写 → 收束近景',
    prompt:
      'Create a sophisticated film-noir-inspired comic illustration with controlled chiaroscuro, cinematic framing, directional light, layered shadows, and carefully composed urban or workplace environments. ' +
      'Use black, charcoal, warm gray, muted cream, and a restrained accent color such as amber or dark red. ' +
      'Build atmosphere through window shadows, corridor perspective, reflections, partial silhouettes, desk lamps, documents, and carefully directed highlights. ' +
      'Keep characters recognizable with stable facial features, controlled expressions, consistent clothing, and readable gestures. ' +
      'Use wide shots to establish the environment, medium shots for investigation, close-ups of meaningful clues, and precise detail shots of documents, screens, or hands. ' +
      'Every mysterious visual element must relate to the actual story. For workplace problem-solving, the mystery may concern a discrepancy, missing information, conflicting figures, or a decision that needs verification. ' +
      'Resolve the story through a meaningful discovery, confirmed result, or thoughtful ending.',
    avoid:
      'Avoid arbitrary crime scenes, weapons, unrelated danger, endless dark backgrounds, obscured faces, excessive smoke, and suspense without a clear connection to the user work.',
    exaggeration: '氛围与光影戏剧化，事实层面保持严谨',
    motif: 'noir',
    c: { bg: '#1E2026', ink: '#0C0D10', a1: '#8FA3B8', a2: '#E3C26A' },
  },
]

export const ART_STYLE_MAP: Record<string, ArtStyle> = ART_STYLES.reduce((m, s) => {
  m[s.id] = s
  return m
}, {} as Record<string, ArtStyle>)

export interface Genre {
  id: string
  name: string
  desc: string
  prompt: string
}

export const GENRES: Genre[] = [
  { id: 'auto', name: 'AI 自动匹配', desc: '根据当天内容自动挑选最合适的故事类型', prompt: '由你根据内容自行判断最合适的故事类型' },
  { id: 'comedy', name: '职场喜剧', desc: '把尴尬和乌龙讲成笑话', prompt: 'workplace comedy, light gags, awkward funny situations, punchline at the end' },
  { id: 'growth', name: '热血成长', desc: '从不会到会，一路打怪升级', prompt: 'shonen growth story, effort and breakthrough, rising momentum, determined spirit' },
  { id: 'business', name: '商务攻坚', desc: '谈判、投标、拿下的那一瞬间', prompt: 'high-stakes business battle, negotiation tension, strategic moves, decisive win' },
  { id: 'daily', name: '日常纪实', desc: '真实、克制地记录一天', prompt: 'quiet daily documentary, faithful and restrained, ordinary moments matter' },
  { id: 'scifi', name: '科幻脑洞', desc: '把工作场景放进未来想象', prompt: 'speculative sci-fi twist, futuristic re-imagining of ordinary work, imaginative concepts' },
  { id: 'mystery', name: '推理破局', desc: '抽丝剥茧，找到那个原因', prompt: 'deductive mystery, clue hunting, revealing the root cause, aha moment' },
  { id: 'healing', name: '温情治愈', desc: '人和人之间的一点暖意', prompt: 'warm healing story, human kindness, gentle emotional resolution' },
  { id: 'epic', name: '史诗冒险', desc: '把一天讲成一场远征', prompt: 'epic adventure, grand scale quest framing, heroic journey metaphor' },
]

export const GENRE_MAP: Record<string, Genre> = GENRES.reduce((m, g) => {
  m[g.id] = g
  return m
}, {} as Record<string, Genre>)

export interface Tone {
  id: string
  name: string
  desc: string
  prompt: string
}

export const TONES: Tone[] = [
  { id: 'humor', name: '幽默轻松', desc: '俏皮、自嘲、会心一笑', prompt: 'humorous and light tone, witty narration, gentle self-mockery' },
  { id: 'passion', name: '热血励志', desc: '燃起来，往前冲', prompt: 'passionate and inspiring tone, energetic narration, forward drive' },
  { id: 'warm', name: '温暖治愈', desc: '柔软、善意、被理解', prompt: 'warm and healing tone, tender narration, emotional softness' },
  { id: 'calm', name: '冷静纪实', desc: '不夸张，只陈述', prompt: 'calm documentary tone, factual restrained narration, no exaggeration' },
  { id: 'drama', name: '戏剧反转', desc: '铺垫、转折、出乎意料', prompt: 'dramatic twist tone, build-up then reversal, surprising turn' },
  { id: 'pro', name: '专业克制', desc: '商务、精确、有分寸', prompt: 'professional and restrained tone, precise business narration, measured wording' },
]

export const TONE_MAP: Record<string, Tone> = TONES.reduce((m, t) => {
  m[t.id] = t
  return m
}, {} as Record<string, Tone>)

export const LENGTHS = [
  { v: 4, name: '4 格', desc: '快速记录，一分钟讲完' },
  { v: 6, name: '6 格', desc: '标准模式，起承转合完整' },
  { v: 8, name: '8 格', desc: '完整故事，细节更丰富' },
]

export const TAGS = [
  '会议',
  '项目推进',
  '商务沟通',
  '任务完成',
  '问题解决',
  '灵感记录',
  '团队协作',
  '学习成长',
]

export const MOODS = ['元气满满', '平静专注', '有点疲惫', '小有成就', '焦虑紧张', '开心满足']

/* ============================================================
 * 镜头节奏：同一篇漫画内保证景别不重复相邻
 * ============================================================ */

export interface Shot {
  id: string
  name: string
  en: string
  hint: string
}

export const SHOTS: Shot[] = [
  { id: 'wide', name: '远景', en: 'environmental wide shot', hint: '交代地点与环境，人物在环境中但不大' },
  { id: 'full', name: '全景', en: 'full-body shot', hint: '呈现完整人物与动作' },
  { id: 'medium', name: '中景', en: 'medium shot', hint: '表现人物互动与对话' },
  { id: 'close', name: '近景', en: 'close-up shot', hint: '表现情绪、表情与关键动作' },
  { id: 'insert', name: '特写', en: 'extreme close-up insert', hint: '突出重要文件、物品、手部动作' },
]

export const SHOT_MAP: Record<string, Shot> = SHOTS.reduce((m, s) => {
  m[s.id] = s
  return m
}, {} as Record<string, Shot>)

const SHOT_CYCLE = ['wide', 'full', 'medium', 'close', 'insert', 'medium', 'full', 'close']

/** 按格数生成镜头序列，保证相邻两格景别不同，且覆盖远/全/中/近/特 */
export function shotPlan(length: number): Shot[] {
  const n = Math.max(1, length)
  const out: Shot[] = []
  for (let i = 0; i < n; i++) {
    let id = SHOT_CYCLE[i % SHOT_CYCLE.length]
    const prev = out[i - 1]?.id
    if (id === prev) {
      const alt = SHOT_CYCLE.find((s) => s !== prev && s !== id)
      if (alt) id = alt
    }
    out.push(SHOT_MAP[id])
  }
  // 短篇也必须覆盖「远景交代 + 特写/近景细节」
  if (n >= 3 && !out.some((s) => s.id === 'wide')) out[0] = SHOT_MAP.wide
  if (n >= 3 && !out.some((s) => s.id === 'insert' || s.id === 'close')) out[n - 2] = SHOT_MAP.insert
  return out
}

export function shotOf(length: number, index: number): Shot {
  const plan = shotPlan(length)
  return plan[Math.min(index, plan.length - 1)] || SHOT_MAP.medium
}

/* ============================================================
 * 统一艺术指导 Art Direction
 * 同一篇漫画只生成一次，所有分镜共用，杜绝画风漂移
 * ============================================================ */

function hashSeed(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

export interface ArtDirection {
  text: string
  accent: string
}

/** 依据画风 + 作品级种子生成固定 Art Direction；同一 comic 复用同一份 */
export function buildArtDirection(style: ArtStyle, seed: string): ArtDirection {
  const h = hashSeed(`${style.id}:${seed}`)
  const accent = h % 2 === 0 ? style.c.a1 : style.c.a2
  const text = [
    `ART DIRECTION FOR THIS COMIC (must stay identical across every panel):`,
    `- Visual identity: ${style.name}. ${style.identity}`,
    `- Fixed color system: ${style.palette}. Dominant accent for this comic: ${accent}. Background base: ${style.c.bg}. Line color: ${style.c.ink}.`,
    `- Line and texture: ${style.line}`,
    `- Lighting rule: ${style.light}`,
    `- Background design rule: ${style.comp}`,
    `- Camera rhythm: ${style.camera}`,
    `- Exaggeration level: ${style.exaggeration}`,
    `- Forbidden visual elements: ${style.avoid}`,
    `Do NOT change art medium, outline style, character proportions, rendering approach or main color system between panels. Only camera distance, angle, action, lighting intensity and local background may vary.`,
  ].join('\n')
  return { text, accent }
}

/* ============================================================
 * 分镜提示词组装：公共质量 + 画风 + 艺术指导 + 角色 + 本格 + 排除项
 * ============================================================ */

export interface HeroPrompt {
  name: string
  gender: string
  hair: string
  outfit: string
  features: string
  skin: string
}

export interface PanelPrompt {
  shot: Shot
  scene: string
  characters: string
  action: string
  focus: string
  emotion: string
  visualPrompt: string
  narration?: string
  dialogue?: string
}

export function heroText(h: HeroPrompt): string {
  return [
    `FIXED MAIN CHARACTER (must look identical in every panel):`,
    `- Name or reference: ${h.name}`,
    `- Gender: ${h.gender}`,
    `- Hair: ${h.hair}`,
    `- Outfit: ${h.outfit}`,
    `- Facial and body traits: ${h.features}`,
    `- Skin tone: ${h.skin}`,
  ].join('\n')
}

/**
 * 组装单格画面提示词。
 * 结构固定为：公共质量规范 + 画风专属规范 + 本篇艺术指导 + 固定角色 + 本格内容 + 排除项
 */
export function composePanelPrompt(input: {
  style: ArtStyle
  ad: ArtDirection
  hero: HeroPrompt
  panel: PanelPrompt
  genrePrompt?: string
}): string {
  const { style, ad, hero, panel, genrePrompt } = input
  const blocks: string[] = []

  blocks.push(`[QUALITY BASE]\n${COMIC_QUALITY_BASE.positive}`)
  blocks.push(`[CHARACTER STANDARD]\n${COMIC_QUALITY_BASE.character}`)
  blocks.push(`[ENVIRONMENT STANDARD]\n${COMIC_QUALITY_BASE.environment}`)
  blocks.push(`[TRUTHFULNESS]\n${COMIC_QUALITY_BASE.truthfulness}`)
  blocks.push(`[ART STYLE: ${style.name}]\n${style.prompt}\n${style.avoid}`)
  blocks.push(ad.text)
  blocks.push(heroText(hero))
  if (genrePrompt) blocks.push(`[GENRE]\n${genrePrompt}`)
  blocks.push(
    [
      '[THIS PANEL]',
      `- Camera: ${panel.shot.en} (${panel.shot.name}). ${panel.shot.hint}`,
      `- Scene: ${panel.scene}`,
      `- Characters present: ${panel.characters || hero.name}`,
      `- Action and body language: ${panel.action}`,
      `- Visual focus of this panel: ${panel.focus}`,
      `- Emotional tone: ${panel.emotion}`,
      panel.visualPrompt ? `- Visual description: ${panel.visualPrompt}` : '',
      panel.narration ? `- Narration context (text is rendered by the webpage, never draw it): ${panel.narration}` : '',
      panel.dialogue ? `- Dialogue context (text is rendered by the webpage, never draw it): ${panel.dialogue}` : '',
      'Render this single panel only. One clear focal point. No text, no letters, no speech bubbles, no watermark inside the artwork.',
    ]
      .filter(Boolean)
      .join('\n'),
  )
  blocks.push(`[AVOID]\n${COMIC_QUALITY_BASE.negatives.map((n) => `- ${n}`).join('\n')}\n- ${style.avoid.replace(/^Avoid\s*/i, '')}`)

  return blocks.join('\n\n')
}

/* ---------------- 风格示例缩略图 ---------------- */
// 每种风格生成一张结构不同的示例缩略图，而不是同一张图换名字。
export function styleThumb(s: ArtStyle): string {
  const { bg, ink, a1, a2 } = s.c
  const W = 108
  const H = 108
  const defs: string[] = []
  const body: string[] = []

  defs.push(`<linearGradient id="g${s.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${bg}"/><stop offset="1" stop-color="${mix(bg, ink, 0.14)}"/></linearGradient>`)
  body.push(`<rect width="${W}" height="${H}" fill="url(#g${s.id})"/>`)

  const bust = (cx: number, cy: number, sc: number, hairC: string, skin: string, cloth: string) =>
    `<g transform="translate(${cx} ${cy}) scale(${sc})">
      <path d="M-30 46 q30 -26 60 0 z" fill="${cloth}"/>
      <ellipse cx="0" cy="6" rx="17" ry="19" fill="${skin}"/>
      <path d="M-18 4 q18 -20 36 0 q-4 -20 -18 -20 q-14 0 -18 20 z" fill="${hairC}"/>
      <circle cx="-6" cy="6" r="1.9" fill="${ink}"/>
      <circle cx="6" cy="6" r="1.9" fill="${ink}"/>
    </g>`

  switch (s.motif) {
    case 'healing':
      defs.push(`<radialGradient id="r${s.id}"><stop offset="0" stop-color="#FFF6E2"/><stop offset="1" stop-color="${a1}" stop-opacity="0.15"/></radialGradient>`)
      body.push(`<rect width="${W}" height="${H}" fill="url(#r${s.id})"/>`)
      body.push(`<circle cx="82" cy="24" r="15" fill="${a1}" opacity="0.35"/>`)
      body.push(`<path d="M0 88 q28 -30 54 -6 q26 24 54 -10 L108 108 L0 108 Z" fill="${a2}" opacity="0.5"/>`)
      body.push(bust(48, 54, 1.0, '#7A5A44', '#F6D6B8', a2))
      for (let i = 0; i < 10; i++) body.push(`<circle cx="${8 + i * 11}" cy="${12 + (i % 3) * 6}" r="1.4" fill="${a1}" opacity="0.7"/>`)
      break
    case 'western':
      body.push(`<rect y="0" width="${W}" height="46" fill="${a1}" opacity="0.85"/>`)
      body.push(`<circle cx="70" cy="52" r="20" fill="${a2}" opacity="0.55"/>`)
      body.push(`<path d="M0 70 L108 62 L108 108 L0 108 Z" fill="${mix(a1, ink, 0.35)}"/>`)
      body.push(`<path d="M0 84 L108 78" stroke="${ink}" stroke-width="3" opacity="0.5"/>`)
      body.push(bust(44, 60, 1.05, ink, '#E8B48A', a2))
      body.push(`<path d="M18 96 L98 92" stroke="${ink}" stroke-width="2.5" opacity="0.6"/>`)
      break
    case 'inkwash':
      defs.push(`<radialGradient id="w${s.id}"><stop offset="0" stop-color="${mix(ink, bg, 0.6)}"/><stop offset="1" stop-color="${bg}" stop-opacity="0"/></radialGradient>`)
      body.push(`<ellipse cx="34" cy="70" rx="34" ry="26" fill="url(#w${s.id})" opacity="0.5"/>`)
      body.push(`<path d="M60 108 q-6 -52 22 -70 q10 34 4 70 z" fill="${ink}" opacity="0.72"/>`)
      body.push(`<path d="M28 30 q22 -14 44 2" stroke="${ink}" stroke-width="2.4" fill="none" opacity="0.75"/>`)
      body.push(`<circle cx="88" cy="26" r="7" fill="${a2}" opacity="0.85"/>`)
      for (let i = 0; i < 6; i++) body.push(`<circle cx="${70 + i * 5}" cy="${92 - i * 3}" r="${2.2 - i * 0.25}" fill="${ink}" opacity="0.35"/>`)
      break
    case 'cyber':
      body.push(`<rect width="${W}" height="${H}" fill="${bg}"/>`)
      for (let i = 0; i < 7; i++) body.push(`<path d="M0 ${18 + i * 14} L108 ${10 + i * 14}" stroke="${a1}" stroke-width="0.8" opacity="0.35"/>`)
      for (let i = 0; i < 7; i++) body.push(`<path d="M${i * 18} 0 L${i * 18 - 20} 108" stroke="${a2}" stroke-width="0.7" opacity="0.22"/>`)
      body.push(`<rect x="26" y="30" width="56" height="56" rx="6" fill="none" stroke="${a1}" stroke-width="2"/>`)
      body.push(`<circle cx="54" cy="58" r="16" fill="${a2}" opacity="0.55"/>`)
      body.push(`<circle cx="54" cy="58" r="9" fill="${bg}"/>`)
      body.push(`<path d="M26 92 h56" stroke="${a1}" stroke-width="2.5" opacity="0.9"/>`)
      body.push(`<circle cx="86" cy="20" r="3" fill="${a1}"/>`)
      break
    case 'european':
      for (let i = 0; i < 12; i++) body.push(`<path d="M0 ${i * 9 + 4} L108 ${i * 9 - 2}" stroke="${ink}" stroke-width="0.5" opacity="0.13"/>`)
      body.push(`<rect x="14" y="20" width="80" height="66" rx="3" fill="${mix(bg, a1, 0.25)}"/>`)
      body.push(`<rect x="14" y="20" width="80" height="66" rx="3" fill="none" stroke="${ink}" stroke-width="1.2" opacity="0.65"/>`)
      body.push(bust(54, 56, 0.95, '#4A4038', '#E4C0A0', a1))
      body.push(`<path d="M14 70 L94 64" stroke="${ink}" stroke-width="1" opacity="0.4"/>`)
      body.push(`<rect x="70" y="24" width="20" height="14" fill="${a2}" opacity="0.7"/>`)
      break
    case 'hero':
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2
        body.push(`<path d="M54 54 L${54 + Math.cos(a) * 80} ${54 + Math.sin(a) * 80}" stroke="${a1}" stroke-width="${i % 2 ? 1.6 : 3}" opacity="0.35"/>`)
      }
      body.push(`<circle cx="54" cy="54" r="22" fill="${a2}"/>`)
      body.push(`<path d="M32 54 q22 -26 44 0 q-22 26 -44 0 z" fill="${ink}" opacity="0.25"/>`)
      body.push(bust(54, 56, 1.1, ink, '#F0C39A', a1))
      body.push(`<path d="M20 96 L88 88" stroke="${ink}" stroke-width="4"/>`)
      break
    case 'manga':
      defs.push(`<pattern id="p${s.id}" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r="1.5" fill="${ink}"/></pattern>`)
      body.push(`<rect width="${W}" height="${H}" fill="#fff"/>`)
      body.push(`<path d="M0 0 L48 0 L18 108 L0 108 Z" fill="url(#p${s.id})" opacity="0.55"/>`)
      body.push(`<path d="M108 0 L60 0 L96 108 L108 108 Z" fill="${ink}" opacity="0.85"/>`)
      body.push(bust(56, 52, 1.0, '#1A1A1A', '#FFFFFF', '#1A1A1A'))
      body.push(`<path d="M22 100 q34 -18 66 4" stroke="${ink}" stroke-width="3" fill="none"/>`)
      break
    case 'pop':
      defs.push(`<pattern id="d${s.id}" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="2.3" fill="${a1}"/></pattern>`)
      body.push(`<rect width="${W}" height="${H}" fill="${bg}"/>`)
      body.push(`<circle cx="54" cy="52" r="34" fill="${a2}" opacity="0.85"/>`)
      body.push(`<circle cx="58" cy="48" r="34" fill="url(#d${s.id})" opacity="0.75"/>`)
      body.push(bust(56, 54, 0.95, ink, '#FFE0BE', a1))
      body.push(`<rect x="0" y="90" width="${W}" height="18" fill="${ink}" opacity="0.85"/>`)
      break
    case 'chibi':
      body.push(`<circle cx="54" cy="50" r="40" fill="${a2}" opacity="0.35"/>`)
      body.push(bust(54, 56, 1.25, '#6B4A56', '#FFE1CC', a1))
      body.push(`<circle cx="44" cy="58" r="5" fill="${a1}" opacity="0.55"/>`)
      body.push(`<circle cx="66" cy="58" r="5" fill="${a1}" opacity="0.55"/>`)
      body.push(`<path d="M90 20 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 z" fill="${a2}"/>`)
      body.push(`<path d="M20 26 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 z" fill="${a1}"/>`)
      break
    case 'magazine':
      body.push(`<circle cx="40" cy="44" r="26" fill="${a1}" opacity="0.8"/>`)
      body.push(`<rect x="48" y="46" width="46" height="40" rx="4" fill="${a2}" opacity="0.85"/>`)
      body.push(`<path d="M14 96 L94 96" stroke="${ink}" stroke-width="2"/>`)
      body.push(`<rect x="14" y="14" width="18" height="18" fill="none" stroke="${ink}" stroke-width="1.6"/>`)
      body.push(`<path d="M70 18 l16 16 M86 18 l-16 16" stroke="${ink}" stroke-width="1.6"/>`)
      body.push(`<circle cx="88" cy="92" r="6" fill="${a1}"/>`)
      break
    case 'guoman':
      defs.push(`<linearGradient id="q${s.id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a1}"/><stop offset="1" stop-color="${a2}"/></linearGradient>`)
      body.push(`<path d="M0 0 L108 0 L108 40 q-30 16 -54 0 q-28 -16 -54 6 Z" fill="url(#q${s.id})" opacity="0.55"/>`)
      body.push(`<path d="M20 84 q18 -14 34 -2 q16 12 32 -4" stroke="${ink}" stroke-width="2.4" fill="none" opacity="0.8"/>`)
      body.push(bust(54, 58, 1.0, '#20242E', '#F7DCC0', a1))
      body.push(`<path d="M78 84 q14 -10 24 0 q-12 10 -24 0 z" fill="${a2}" opacity="0.8"/>`)
      body.push(`<circle cx="26" cy="26" r="9" fill="none" stroke="${a1}" stroke-width="2" opacity="0.8"/>`)
      break
    case 'noir':
      body.push(`<rect width="${W}" height="${H}" fill="${bg}"/>`)
      for (let i = 0; i < 8; i++) body.push(`<path d="M${-20 + i * 18} 108 L${20 + i * 18} 0" stroke="${a1}" stroke-width="6" opacity="0.16"/>`)
      body.push(`<path d="M0 0 L108 0 L108 108 L0 108 Z" fill="${ink}" opacity="0.35"/>`)
      body.push(`<ellipse cx="54" cy="60" rx="30" ry="34" fill="${a2}" opacity="0.22"/>`)
      body.push(bust(54, 58, 1.05, '#101216', '#D9C3A5', '#2A2E36'))
      body.push(`<rect x="0" y="0" width="46" height="108" fill="${ink}" opacity="0.55"/>`)
      body.push(`<path d="M46 0 L70 0 L58 108 L34 108 Z" fill="${a2}" opacity="0.18"/>`)
      break
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" height="100%"><defs>${defs.join('')}</defs>${body.join('')}</svg>`
}

function hex(c: string) {
  const h = c.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function mix(a: string, b: string, t: number) {
  const [r1, g1, b1] = hex(a)
  const [r2, g2, b2] = hex(b)
  const f = (x: number, y: number) => Math.round(x + (y - x) * t)
  return `rgb(${f(r1, r2)},${f(g1, g2)},${f(b1, b2)})`
}

export const THUMB_CACHE: Record<string, string> = {}
export function thumbOf(id: string) {
  const s = ART_STYLE_MAP[id]
  if (!s) return ''
  if (!THUMB_CACHE[id]) THUMB_CACHE[id] = styleThumb(s)
  return THUMB_CACHE[id]
}
