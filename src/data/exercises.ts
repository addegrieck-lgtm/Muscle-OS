import type { Equipment, Exercise, Level, MovementPattern, MuscleGroupId } from '../types/models';

type Opts = Partial<
  Pick<Exercise, 'mode' | 'defaultRange' | 'defaultSets' | 'restSec' | 'loadable' | 'unilateral' | 'progression' | 'regression' | 'level'>
> & { cues: string[]; mistakes: string[] };

const LEVEL_BY_DIFFICULTY: Record<number, Level> = { 1: 'beginner', 2: 'beginner', 3: 'intermediate', 4: 'intermediate', 5: 'advanced' };
const COMPOUND: MovementPattern[] = ['push_h', 'push_v', 'pull_h', 'pull_v', 'squat', 'hinge', 'lunge'];

function E(
  id: string,
  name: string,
  primary: MuscleGroupId,
  secondary: MuscleGroupId[],
  pattern: MovementPattern,
  difficulty: Exercise['difficulty'],
  equipment: Equipment[],
  o: Opts,
): Exercise {
  const compound = COMPOUND.includes(pattern);
  const mode = o.mode ?? 'reps';
  return {
    id,
    name,
    primary,
    secondary,
    pattern,
    difficulty,
    level: o.level ?? LEVEL_BY_DIFFICULTY[difficulty],
    equipment,
    mode,
    defaultRange: o.defaultRange ?? (mode === 'time' ? [20, 40] : compound ? [8, 15] : [10, 20]),
    defaultSets: o.defaultSets ?? 3,
    restSec: o.restSec ?? (mode === 'time' ? 45 : compound ? 90 : 60),
    loadable: o.loadable ?? false,
    unilateral: o.unilateral,
    compound,
    cues: o.cues,
    mistakes: o.mistakes,
    progression: o.progression,
    regression: o.regression,
  };
}

export const EXERCISES: Exercise[] = [
  // ================= PECTORAUX =================
  E('wall_pushup', 'Pompes au mur', 'chest', ['triceps', 'shoulders'], 'push_h', 1, [], {
    defaultRange: [12, 20],
    progression: 'incline_pushup',
    cues: ['Mains à hauteur d’épaules contre le mur', 'Corps gainé de la tête aux talons', 'Descends jusqu’à frôler le mur avec la poitrine'],
    mistakes: ['Bassin qui part en arrière', 'Coudes écartés à 90°'],
  }),
  E('incline_pushup', 'Pompes inclinées', 'chest', ['triceps', 'shoulders'], 'push_h', 1, [], {
    progression: 'pushup',
    regression: 'wall_pushup',
    cues: ['Mains sur une table ou un plan de travail stable', 'Coudes à ~45° du corps', 'Poitrine vers le bord, corps aligné'],
    mistakes: ['Support instable', 'Hanches qui s’affaissent', 'Amplitude partielle'],
  }),
  E('knee_pushup', 'Pompes sur les genoux', 'chest', ['triceps', 'shoulders'], 'push_h', 1, [], {
    progression: 'pushup',
    regression: 'incline_pushup',
    cues: ['Genoux au sol, alignement genoux-hanches-épaules', 'Poitrine jusqu’à quelques cm du sol', 'Pousse le sol loin de toi'],
    mistakes: ['Fesses en l’air', 'Tête qui plonge avant la poitrine'],
  }),
  E('pushup', 'Pompes', 'chest', ['triceps', 'shoulders', 'abs'], 'push_h', 2, [], {
    progression: 'decline_pushup',
    regression: 'incline_pushup',
    cues: ['Mains un peu plus larges que les épaules', 'Gainage abdos + fessiers', 'Coudes à ~45°, poitrine proche du sol', 'Expire en poussant'],
    mistakes: ['Dos creusé', 'Coudes à 90° (stress épaules)', 'Amplitude incomplète'],
  }),
  E('wide_pushup', 'Pompes larges', 'chest', ['shoulders', 'triceps'], 'push_h', 2, [], {
    progression: 'archer_pushup',
    regression: 'knee_pushup',
    cues: ['Mains 1,5× largeur d’épaules', 'Descente contrôlée 2 secondes', 'Étirement des pectoraux en bas'],
    mistakes: ['Mains trop écartées (douleur épaules)', 'Rebond en bas'],
  }),
  E('decline_pushup', 'Pompes déclinées', 'chest', ['shoulders', 'triceps'], 'push_h', 3, ['chair'], {
    progression: 'archer_pushup',
    regression: 'pushup',
    cues: ['Pieds sur une chaise stable', 'Corps parfaitement aligné', 'Cible le haut des pectoraux'],
    mistakes: ['Bassin trop haut', 'Chaise qui glisse'],
  }),
  E('archer_pushup', 'Pompes archer', 'chest', ['triceps', 'shoulders'], 'push_h', 4, [], {
    defaultRange: [5, 10],
    unilateral: true,
    regression: 'wide_pushup',
    cues: ['Mains très écartées', 'Descends vers une main, l’autre bras reste tendu', 'Alterne les côtés'],
    mistakes: ['Rotation du buste', 'Bras tendu qui plie'],
  }),
  E('backpack_pushup', 'Pompes lestées (sac à dos)', 'chest', ['triceps', 'shoulders'], 'push_h', 3, ['backpack'], {
    loadable: true,
    defaultRange: [8, 12],
    regression: 'pushup',
    cues: ['Sac bien serré haut sur le dos', 'Même technique que les pompes', 'Ajoute du poids progressivement (livres, bouteilles)'],
    mistakes: ['Sac qui glisse vers la nuque', 'Perte d’alignement'],
  }),
  E('db_floor_press', 'Floor press haltères', 'chest', ['triceps', 'shoulders'], 'push_h', 2, ['dumbbells'], {
    loadable: true,
    defaultRange: [8, 12],
    cues: ['Allongé au sol, genoux fléchis', 'Descends jusqu’à poser les coudes', 'Pousse vers le plafond, poignets neutres'],
    mistakes: ['Coudes qui rebondissent au sol', 'Haltères qui s’écartent'],
  }),
  E('db_bench_press', 'Développé couché haltères', 'chest', ['triceps', 'shoulders'], 'push_h', 2, ['dumbbells', 'bench'], {
    loadable: true,
    defaultRange: [8, 12],
    cues: ['Omoplates serrées sur le banc', 'Pieds ancrés au sol', 'Descente contrôlée au niveau du bas des pecs'],
    mistakes: ['Fesses qui décollent', 'Amplitude trop courte'],
  }),
  E('db_fly', 'Écarté haltères', 'chest', ['shoulders'], 'isolation', 2, ['dumbbells'], {
    loadable: true,
    defaultRange: [10, 15],
    cues: ['Coudes légèrement fléchis et fixes', 'Ouvre en arc de cercle', 'Serre les pecs en remontant'],
    mistakes: ['Charge trop lourde', 'Bras tendus (stress coude)'],
  }),
  E('band_chest_press', 'Développé élastique', 'chest', ['triceps', 'shoulders'], 'push_h', 1, ['bands'], {
    defaultRange: [12, 20],
    cues: ['Élastique ancré dans le dos (porte ou dos)', 'Pousse devant toi en fente', 'Contrôle le retour'],
    mistakes: ['Retour brusque', 'Poignets cassés'],
  }),

  // ================= DOS / DORSAUX =================
  E('door_frame_row', 'Rowing au cadre de porte', 'lats', ['biceps', 'traps', 'forearms'], 'pull_h', 1, [], {
    defaultRange: [10, 15],
    unilateral: true,
    progression: 'table_row',
    cues: ['Saisis solidement un cadre de porte d’une main, pieds proches du seuil', 'Penche-toi en arrière bras tendu, corps gainé', 'Tire la poitrine vers le cadre ; plus les pieds avancent, plus c’est dur'],
    mistakes: ['Prise glissante', 'Rotation du buste', 'Hausser l’épaule'],
  }),
  E('towel_row_iso', 'Tirage isométrique à la serviette', 'lats', ['biceps', 'traps'], 'pull_h', 1, [], {
    mode: 'time',
    defaultRange: [15, 30],
    cues: ['Assis jambes tendues, serviette autour des pieds', 'Tire les coudes vers l’arrière le plus fort possible', 'Maintiens la contraction en respirant'],
    mistakes: ['Dos rond', 'Tirer avec les poignets seulement'],
  }),
  E('backpack_row', 'Rowing sac à dos', 'lats', ['biceps', 'traps', 'shoulders'], 'pull_h', 1, ['backpack'], {
    loadable: true,
    defaultRange: [10, 15],
    cues: ['Buste penché à ~45°, dos plat', 'Tire le sac vers le nombril', 'Serre les omoplates 1 s en haut'],
    mistakes: ['Dos rond', 'Élan avec le buste'],
  }),
  E('db_row', 'Rowing unilatéral haltère', 'lats', ['biceps', 'traps', 'shoulders'], 'pull_h', 2, ['dumbbells'], {
    loadable: true,
    unilateral: true,
    defaultRange: [8, 12],
    cues: ['Une main et un genou en appui (chaise/banc)', 'Tire le coude vers la hanche', 'Descente lente'],
    mistakes: ['Rotation du buste', 'Épaule qui monte vers l’oreille'],
  }),
  E('kb_row', 'Rowing kettlebell', 'lats', ['biceps', 'traps'], 'pull_h', 2, ['kettlebell'], {
    loadable: true,
    unilateral: true,
    defaultRange: [8, 12],
    cues: ['Appui main sur genou, dos plat', 'Coude près du corps', 'Contrôle en bas'],
    mistakes: ['Dos arrondi', 'Tirer avec le biceps uniquement'],
  }),
  E('band_row', 'Tirage élastique', 'lats', ['biceps', 'traps'], 'pull_h', 1, ['bands'], {
    defaultRange: [12, 20],
    cues: ['Élastique ancré à hauteur de poitrine', 'Tire les coudes en arrière', 'Poitrine sortie'],
    mistakes: ['Dos qui s’arrondit', 'Élastique trop faible'],
  }),
  E('band_pulldown', 'Tirage vertical élastique', 'lats', ['biceps'], 'pull_v', 1, ['bands'], {
    defaultRange: [12, 20],
    cues: ['Élastique ancré en hauteur', 'Tire les coudes vers les hanches', 'Épaules basses'],
    mistakes: ['Hausser les épaules', 'Balancer le buste'],
  }),
  E('table_row', 'Tirage inversé sous table', 'lats', ['biceps', 'traps', 'shoulders'], 'pull_h', 2, ['table'], {
    progression: 'negative_pullup',
    regression: 'backpack_row',
    cues: ['Table très solide — vérifie qu’elle ne bascule pas', 'Corps gainé, talons au sol', 'Poitrine vers le bord de la table'],
    mistakes: ['Table légère ou instable (danger)', 'Hanches qui tombent'],
  }),
  E('assisted_pullup', 'Tractions assistées (élastique)', 'lats', ['biceps', 'forearms'], 'pull_v', 2, ['pullup_bar', 'bands'], {
    defaultRange: [5, 10],
    progression: 'pullup',
    cues: ['Élastique accroché à la barre sous un pied ou genou', 'Pars bras tendus, épaules engagées', 'Menton au-dessus de la barre'],
    mistakes: ['Demi-amplitude', 'Balancement'],
  }),
  E('negative_pullup', 'Tractions négatives', 'lats', ['biceps', 'forearms'], 'pull_v', 3, ['pullup_bar'], {
    defaultRange: [3, 6],
    progression: 'pullup',
    regression: 'table_row',
    cues: ['Monte avec un saut ou une chaise', 'Descends en 3-5 secondes', 'Contrôle jusqu’à bras tendus'],
    mistakes: ['Descente qui accélère', 'Épaules relâchées en bas'],
  }),
  E('chinup', 'Tractions supination', 'lats', ['biceps', 'forearms'], 'pull_v', 3, ['pullup_bar'], {
    defaultRange: [4, 10],
    progression: 'pullup',
    regression: 'negative_pullup',
    cues: ['Paumes vers toi, largeur d’épaules', 'Poitrine vers la barre', 'Descente complète'],
    mistakes: ['Kipping (élan)', 'Amplitude partielle'],
  }),
  E('pullup', 'Tractions', 'lats', ['biceps', 'traps', 'forearms'], 'pull_v', 4, ['pullup_bar'], {
    defaultRange: [4, 10],
    progression: 'weighted_pullup',
    regression: 'negative_pullup',
    cues: ['Prise pronation un peu plus large que les épaules', 'Abaisse les omoplates puis tire', 'Menton au-dessus de la barre'],
    mistakes: ['Élan', 'Ne pas tendre les bras en bas'],
  }),
  E('weighted_pullup', 'Tractions lestées', 'lats', ['biceps', 'traps', 'forearms'], 'pull_v', 5, ['pullup_bar', 'backpack'], {
    loadable: true,
    defaultRange: [4, 8],
    regression: 'pullup',
    cues: ['Sac à dos lesté bien fixé', 'Même technique stricte', 'Charge augmentée par petits paliers'],
    mistakes: ['Charge trop lourde', 'Balancement'],
  }),
  E('db_pullover', 'Pull-over haltère', 'lats', ['chest', 'triceps'], 'isolation', 2, ['dumbbells'], {
    loadable: true,
    defaultRange: [10, 15],
    cues: ['Allongé, haltère tenu à deux mains au-dessus de la poitrine', 'Descends derrière la tête bras légèrement fléchis', 'Remonte en contractant les dorsaux'],
    mistakes: ['Cambrure excessive', 'Coudes qui plient trop'],
  }),

  // ================= ÉPAULES =================
  E('pike_pushup', 'Pompes piquées (pike push-up)', 'shoulders', ['triceps', 'traps'], 'push_v', 3, [], {
    defaultRange: [6, 12],
    progression: 'elevated_pike_pushup',
    regression: 'pushup',
    cues: ['Hanches hautes, corps en V inversé', 'Tête descend devant les mains', 'Coudes vers l’arrière'],
    mistakes: ['Hanches qui descendent (devient une pompe)', 'Tête qui percute le sol'],
  }),
  E('elevated_pike_pushup', 'Pike push-up pieds surélevés', 'shoulders', ['triceps', 'traps'], 'push_v', 4, ['chair'], {
    defaultRange: [5, 10],
    progression: 'wall_hspu',
    regression: 'pike_pushup',
    cues: ['Pieds sur une chaise stable', 'Buste le plus vertical possible', 'Descente contrôlée'],
    mistakes: ['Chaise instable', 'Descente trop rapide'],
  }),
  E('wall_hspu', 'Pompes en équilibre contre le mur', 'shoulders', ['triceps', 'traps'], 'push_v', 5, [], {
    defaultRange: [3, 8],
    regression: 'elevated_pike_pushup',
    cues: ['Uniquement si tu maîtrises l’équilibre contre le mur', 'Mains à 15-20 cm du mur', 'Descente très contrôlée'],
    mistakes: ['Chute sur la tête', 'Cambrure lombaire'],
  }),
  E('db_shoulder_press', 'Développé épaules haltères', 'shoulders', ['triceps', 'traps'], 'push_v', 2, ['dumbbells'], {
    loadable: true,
    defaultRange: [8, 12],
    cues: ['Assis ou debout, abdos serrés', 'Haltères à hauteur d’oreilles', 'Pousse au-dessus de la tête sans cambrer'],
    mistakes: ['Cambrure', 'Coudes trop en arrière'],
  }),
  E('backpack_press', 'Développé épaules sac à dos', 'shoulders', ['triceps'], 'push_v', 2, ['backpack'], {
    loadable: true,
    defaultRange: [10, 15],
    cues: ['Tiens le sac par les côtés devant le visage', 'Pousse au-dessus de la tête', 'Gainage fort'],
    mistakes: ['Cambrer le dos', 'Sac mal fermé'],
  }),
  E('kb_press', 'Développé kettlebell', 'shoulders', ['triceps', 'abs'], 'push_v', 3, ['kettlebell'], {
    loadable: true,
    unilateral: true,
    defaultRange: [6, 10],
    cues: ['Kettlebell en position rack', 'Pousse en ligne droite', 'Fessiers et abdos contractés'],
    mistakes: ['Inclinaison latérale du buste', 'Poignet cassé'],
  }),
  E('db_lateral_raise', 'Élévations latérales haltères', 'shoulders', ['traps'], 'isolation', 1, ['dumbbells'], {
    loadable: true,
    defaultRange: [12, 20],
    restSec: 60,
    cues: ['Coudes légèrement fléchis', 'Monte jusqu’à hauteur d’épaules', 'Descente en 2 secondes'],
    mistakes: ['Élan avec le corps', 'Hausser les épaules'],
  }),
  E('band_lateral_raise', 'Élévations latérales élastique', 'shoulders', ['traps'], 'isolation', 1, ['bands'], {
    defaultRange: [15, 25],
    cues: ['Élastique sous les pieds', 'Monte les coudes sur les côtés', 'Contrôle la descente'],
    mistakes: ['Monter au-dessus des épaules', 'Balancement'],
  }),
  E('db_rear_delt_fly', 'Oiseau haltères (arrière d’épaule)', 'shoulders', ['traps', 'lats'], 'isolation', 2, ['dumbbells'], {
    loadable: true,
    defaultRange: [12, 20],
    cues: ['Buste penché, dos plat', 'Ouvre les bras sur les côtés', 'Pense « écarter les mains »'],
    mistakes: ['Charge trop lourde', 'Serrer les omoplates à la place du deltoïde'],
  }),
  E('band_face_pull', 'Face pull élastique', 'shoulders', ['traps'], 'isolation', 1, ['bands'], {
    defaultRange: [15, 20],
    cues: ['Élastique à hauteur de visage', 'Tire vers le front en écartant les mains', 'Pouces vers l’arrière en fin de mouvement'],
    mistakes: ['Tirer vers la poitrine', 'Cambrer'],
  }),

  // ================= TRAPÈZES =================
  E('prone_ytw', 'Y-T-W au sol', 'traps', ['shoulders', 'lower_back'], 'isolation', 1, [], {
    defaultRange: [8, 12],
    cues: ['À plat ventre, front au sol', 'Lève les bras en Y, puis T, puis W = 1 rép', 'Pouces vers le plafond'],
    mistakes: ['Relever la tête', 'Mouvements rapides'],
  }),
  E('db_shrug', 'Shrug haltères', 'traps', ['forearms'], 'isolation', 1, ['dumbbells'], {
    loadable: true,
    defaultRange: [12, 15],
    cues: ['Bras tendus le long du corps', 'Monte les épaules vers les oreilles', 'Pause 1 s en haut'],
    mistakes: ['Rouler les épaules', 'Plier les coudes'],
  }),
  E('backpack_shrug', 'Shrug sac à dos', 'traps', ['forearms'], 'isolation', 1, ['backpack'], {
    loadable: true,
    defaultRange: [15, 20],
    cues: ['Sac tenu devant toi ou porté sur une épaule', 'Monte les épaules droit', 'Pause en haut'],
    mistakes: ['Mouvement circulaire', 'Tête en avant'],
  }),

  // ================= BICEPS =================
  E('towel_curl', 'Curl isométrique à la serviette', 'biceps', ['forearms'], 'isolation', 1, [], {
    defaultRange: [8, 12],
    unilateral: true,
    cues: ['Serviette sous un pied, tiens les deux extrémités', 'Tire en résistant avec la jambe', 'Contraction 3 secondes par rép'],
    mistakes: ['Pas assez de résistance de la jambe', 'Dos qui se penche'],
  }),
  E('db_curl', 'Curl haltères', 'biceps', ['forearms'], 'isolation', 1, ['dumbbells'], {
    loadable: true,
    defaultRange: [10, 15],
    cues: ['Coudes collés au corps', 'Supination en montant', 'Descente complète et lente'],
    mistakes: ['Balancer le buste', 'Coudes qui avancent'],
  }),
  E('hammer_curl', 'Curl marteau', 'biceps', ['forearms'], 'isolation', 1, ['dumbbells'], {
    loadable: true,
    defaultRange: [10, 15],
    cues: ['Paumes face à face', 'Coudes fixes', 'Contrôle la descente'],
    mistakes: ['Élan', 'Poignets qui plient'],
  }),
  E('band_curl', 'Curl élastique', 'biceps', ['forearms'], 'isolation', 1, ['bands'], {
    defaultRange: [15, 20],
    cues: ['Élastique sous les pieds', 'Coudes fixes', 'Serre en haut 1 s'],
    mistakes: ['Relâcher d’un coup', 'Coudes qui bougent'],
  }),
  E('backpack_curl', 'Curl sac à dos', 'biceps', ['forearms'], 'isolation', 1, ['backpack'], {
    loadable: true,
    defaultRange: [12, 15],
    cues: ['Tiens le sac par la poignée ou les bretelles', 'Coudes contre le corps', 'Descente lente'],
    mistakes: ['Balancement', 'Amplitude partielle'],
  }),
  E('kb_curl', 'Curl kettlebell', 'biceps', ['forearms'], 'isolation', 1, ['kettlebell'], {
    loadable: true,
    defaultRange: [10, 15],
    cues: ['Tiens la kettlebell par les côtés de la poignée', 'Coudes fixes', 'Contrôle'],
    mistakes: ['Élan', 'Dos cambré'],
  }),

  // ================= TRICEPS =================
  E('close_pushup', 'Pompes serrées', 'triceps', ['chest', 'shoulders'], 'push_h', 2, [], {
    progression: 'diamond_pushup',
    regression: 'knee_pushup',
    cues: ['Mains sous les épaules', 'Coudes qui frôlent le buste', 'Corps gainé'],
    mistakes: ['Coudes qui s’écartent', 'Hanches basses'],
  }),
  E('diamond_pushup', 'Pompes diamant', 'triceps', ['chest', 'shoulders'], 'push_h', 3, [], {
    defaultRange: [6, 12],
    regression: 'close_pushup',
    cues: ['Pouces et index forment un losange sous la poitrine', 'Coudes vers l’arrière', 'Descente contrôlée'],
    mistakes: ['Poignets douloureux : repasse aux pompes serrées', 'Dos creusé'],
  }),
  E('chair_dip', 'Dips sur chaise', 'triceps', ['chest', 'shoulders'], 'push_v', 2, ['chair'], {
    defaultRange: [8, 15],
    cues: ['Chaise calée contre un mur', 'Épaules basses, coudes vers l’arrière', 'Descends jusqu’à ~90° de coude'],
    mistakes: ['Descendre trop bas (épaules)', 'Chaise qui glisse'],
  }),
  E('bench_dip', 'Dips sur banc', 'triceps', ['chest', 'shoulders'], 'push_v', 2, ['bench'], {
    defaultRange: [8, 15],
    cues: ['Mains au bord du banc', 'Coudes vers l’arrière', 'Amplitude confortable pour les épaules'],
    mistakes: ['Épaules qui roulent vers l’avant', 'Descente excessive'],
  }),
  E('db_overhead_extension', 'Extension triceps au-dessus de la tête', 'triceps', [], 'isolation', 2, ['dumbbells'], {
    loadable: true,
    defaultRange: [10, 15],
    cues: ['Haltère tenu à deux mains derrière la tête', 'Coudes pointés vers le plafond', 'Tends complètement les bras'],
    mistakes: ['Coudes qui s’écartent', 'Cambrure'],
  }),
  E('db_kickback', 'Kickback haltère', 'triceps', [], 'isolation', 1, ['dumbbells'], {
    loadable: true,
    defaultRange: [12, 15],
    unilateral: true,
    cues: ['Buste penché, bras collé au corps', 'Tends le bras vers l’arrière', 'Pause bras tendu'],
    mistakes: ['Coude qui descend', 'Élan'],
  }),
  E('band_pushdown', 'Extension triceps élastique', 'triceps', [], 'isolation', 1, ['bands'], {
    defaultRange: [15, 20],
    cues: ['Élastique ancré en hauteur', 'Coudes fixes contre le corps', 'Tends jusqu’en bas'],
    mistakes: ['Coudes qui avancent', 'Pencher le buste'],
  }),

  // ================= AVANT-BRAS =================
  E('dead_hang', 'Suspension à la barre', 'forearms', ['lats', 'shoulders'], 'isolation', 2, ['pullup_bar'], {
    mode: 'time',
    defaultRange: [20, 45],
    cues: ['Prise ferme, bras tendus', 'Épaules légèrement engagées', 'Respire calmement'],
    mistakes: ['Épaules complètement relâchées si douleur', 'Balancer'],
  }),
  E('db_farmer_hold', 'Farmer hold haltères', 'forearms', ['traps', 'abs'], 'isolation', 1, ['dumbbells'], {
    mode: 'time',
    loadable: true,
    defaultRange: [30, 60],
    cues: ['Haltères lourds le long du corps', 'Épaules basses, buste droit', 'Serre fort'],
    mistakes: ['Pencher d’un côté', 'Épaules enroulées'],
  }),
  E('backpack_farmer_hold', 'Maintien sac à dos lourd', 'forearms', ['traps'], 'isolation', 1, ['backpack'], {
    mode: 'time',
    loadable: true,
    defaultRange: [30, 60],
    cues: ['Tiens le sac par la poignée d’une main', 'Buste droit', 'Change de main à chaque série'],
    mistakes: ['Inclinaison du buste', 'Poignet cassé'],
  }),
  E('db_wrist_curl', 'Curl poignets haltères', 'forearms', [], 'isolation', 1, ['dumbbells'], {
    loadable: true,
    defaultRange: [15, 20],
    cues: ['Avant-bras posés sur les cuisses', 'Seuls les poignets bougent', 'Amplitude complète'],
    mistakes: ['Charge trop lourde', 'Mouvement des coudes'],
  }),
  E('towel_squeeze', 'Essorage de serviette', 'forearms', [], 'isolation', 1, [], {
    mode: 'time',
    defaultRange: [20, 40],
    cues: ['Serviette roulée tenue à deux mains', 'Tords-la fort dans un sens puis dans l’autre', 'Bras tendus devant'],
    mistakes: ['Serrer trop peu', 'Hausser les épaules'],
  }),

  // ================= ABDOMINAUX =================
  E('crunch', 'Crunch', 'abs', [], 'core_flex', 1, [], {
    defaultRange: [12, 20],
    cues: ['Bas du dos au sol', 'Enroule le haut du dos', 'Expire en montant'],
    mistakes: ['Tirer sur la nuque', 'Monter trop haut (fléchisseurs de hanche)'],
  }),
  E('reverse_crunch', 'Reverse crunch', 'abs', ['obliques'], 'core_flex', 2, [], {
    defaultRange: [10, 15],
    cues: ['Genoux à 90°', 'Enroule le bassin pour décoller les fesses', 'Descente lente'],
    mistakes: ['Élan avec les jambes', 'Relâcher en bas'],
  }),
  E('dead_bug', 'Dead bug', 'abs', ['obliques', 'lower_back'], 'core_anti', 1, [], {
    defaultRange: [8, 12],
    cues: ['Lombaires plaquées au sol', 'Tends bras et jambe opposés', 'Expire longuement'],
    mistakes: ['Dos qui décolle', 'Mouvement trop rapide'],
  }),
  E('knee_plank', 'Planche sur les genoux', 'abs', ['shoulders'], 'core_anti', 1, [], {
    mode: 'time',
    defaultRange: [20, 40],
    progression: 'plank',
    cues: ['Avant-bras au sol, genoux posés', 'Ligne genoux-hanches-épaules', 'Contracte les fessiers'],
    mistakes: ['Fesses en l’air', 'Retenir sa respiration'],
  }),
  E('plank', 'Planche', 'abs', ['shoulders', 'obliques'], 'core_anti', 1, [], {
    mode: 'time',
    defaultRange: [20, 45],
    progression: 'long_lever_plank',
    regression: 'knee_plank',
    cues: ['Coudes sous les épaules', 'Serre fessiers et abdos', 'Regard vers le sol'],
    mistakes: ['Bassin qui s’affaisse', 'Tenir trop longtemps avec une mauvaise forme'],
  }),
  E('long_lever_plank', 'Planche bras avancés', 'abs', ['shoulders', 'obliques'], 'core_anti', 3, [], {
    mode: 'time',
    defaultRange: [15, 30],
    progression: 'hollow_hold',
    regression: 'plank',
    cues: ['Coudes 10-15 cm devant les épaules', 'Bassin en rétroversion', 'Gainage maximal'],
    mistakes: ['Dos creusé', 'Épaules qui s’effondrent'],
  }),
  E('plank_shoulder_tap', 'Planche touche d’épaule', 'abs', ['obliques', 'shoulders'], 'core_anti', 2, [], {
    defaultRange: [10, 20],
    cues: ['Planche bras tendus, pieds écartés', 'Touche l’épaule opposée', 'Bassin immobile'],
    mistakes: ['Bassin qui tourne', 'Mouvement trop rapide'],
  }),
  E('hollow_hold', 'Hollow body', 'abs', ['obliques'], 'core_anti', 3, [], {
    mode: 'time',
    defaultRange: [15, 30],
    regression: 'dead_bug',
    cues: ['Lombaires plaquées', 'Épaules et jambes décollées', 'Bras tendus derrière la tête (ou le long du corps plus facile)'],
    mistakes: ['Dos qui décolle du sol', 'Nuque tendue'],
  }),
  E('leg_raise', 'Relevés de jambes au sol', 'abs', ['obliques'], 'core_flex', 3, [], {
    defaultRange: [8, 15],
    regression: 'reverse_crunch',
    cues: ['Mains sous les fesses si besoin', 'Jambes quasi tendues', 'Ne pose pas les talons en bas'],
    mistakes: ['Dos qui se cambre', 'Élan'],
  }),
  E('v_up', 'V-ups', 'abs', ['obliques'], 'core_flex', 3, [], {
    defaultRange: [8, 12],
    regression: 'crunch',
    cues: ['Monte bras et jambes simultanément', 'Touche tes pieds', 'Redescends lentement'],
    mistakes: ['Élan', 'Dos qui claque au sol'],
  }),
  E('hanging_knee_raise', 'Relevés de genoux suspendu', 'abs', ['forearms', 'obliques'], 'core_flex', 3, ['pullup_bar'], {
    defaultRange: [8, 15],
    progression: 'hanging_leg_raise',
    regression: 'reverse_crunch',
    cues: ['Suspendu bras tendus', 'Monte les genoux vers la poitrine en enroulant le bassin', 'Pas de balancement'],
    mistakes: ['Balancer', 'Monter seulement les cuisses sans enrouler'],
  }),
  E('hanging_leg_raise', 'Relevés de jambes suspendu', 'abs', ['forearms', 'obliques'], 'core_flex', 4, ['pullup_bar'], {
    defaultRange: [6, 12],
    regression: 'hanging_knee_raise',
    cues: ['Jambes tendues', 'Monte au moins à l’horizontale', 'Contrôle la descente'],
    mistakes: ['Élan', 'Descente relâchée'],
  }),
  E('mountain_climber', 'Mountain climbers', 'abs', ['shoulders', 'quads'], 'core_anti', 2, [], {
    mode: 'time',
    defaultRange: [20, 40],
    cues: ['Position de pompe', 'Genoux vers la poitrine en alternance', 'Hanches basses'],
    mistakes: ['Fesses en l’air', 'Épaules en arrière des mains'],
  }),

  // ================= OBLIQUES =================
  E('knee_side_plank', 'Planche latérale sur genou', 'obliques', ['abs', 'shoulders'], 'core_anti', 1, [], {
    mode: 'time',
    defaultRange: [15, 30],
    unilateral: true,
    progression: 'side_plank',
    cues: ['Coude sous l’épaule', 'Genoux au sol, hanches hautes', 'Chaque côté'],
    mistakes: ['Hanches qui tombent', 'Épaule qui s’enfonce'],
  }),
  E('side_plank', 'Planche latérale', 'obliques', ['abs', 'shoulders', 'adductors'], 'core_anti', 2, [], {
    mode: 'time',
    defaultRange: [20, 40],
    unilateral: true,
    progression: 'side_plank_hip_dip',
    regression: 'knee_side_plank',
    cues: ['Corps aligné, pieds empilés', 'Pousse le sol avec le coude', 'Chaque côté'],
    mistakes: ['Bassin en arrière', 'Hanches qui s’affaissent'],
  }),
  E('side_plank_hip_dip', 'Planche latérale dynamique', 'obliques', ['abs'], 'core_flex', 3, [], {
    defaultRange: [8, 15],
    unilateral: true,
    regression: 'side_plank',
    cues: ['Depuis la planche latérale, descends la hanche', 'Remonte au-dessus de l’alignement', 'Chaque côté'],
    mistakes: ['Rotation du buste', 'Vitesse excessive'],
  }),
  E('bicycle_crunch', 'Crunch vélo', 'obliques', ['abs'], 'core_flex', 2, [], {
    defaultRange: [12, 20],
    cues: ['Coude vers genou opposé', 'Jambe opposée tendue', 'Rotation du buste, pas du coude'],
    mistakes: ['Tirer sur la nuque', 'Aller trop vite'],
  }),
  E('russian_twist', 'Russian twist', 'obliques', ['abs'], 'core_flex', 2, [], {
    defaultRange: [12, 20],
    cues: ['Buste incliné en arrière, dos droit', 'Tourne les épaules de chaque côté', 'Pieds au sol (plus facile) ou décollés'],
    mistakes: ['Dos rond', 'Bouger seulement les bras'],
  }),
  E('pallof_press', 'Pallof press élastique', 'obliques', ['abs'], 'core_anti', 2, ['bands'], {
    defaultRange: [10, 15],
    unilateral: true,
    cues: ['Élastique ancré sur le côté à hauteur de poitrine', 'Pousse devant sans laisser le buste tourner', 'Chaque côté'],
    mistakes: ['Rotation du buste', 'Élastique trop faible'],
  }),

  // ================= LOMBAIRES =================
  E('bird_dog', 'Bird dog', 'lower_back', ['glutes', 'abs'], 'core_anti', 1, [], {
    defaultRange: [8, 12],
    cues: ['À quatre pattes, dos neutre', 'Tends bras et jambe opposés', 'Pause 2 s, bassin stable'],
    mistakes: ['Cambrer', 'Bassin qui tourne'],
  }),
  E('superman', 'Superman', 'lower_back', ['glutes', 'traps'], 'core_anti', 1, [], {
    defaultRange: [10, 15],
    cues: ['À plat ventre', 'Décolle bras et jambes légèrement', 'Pause 2 s en haut'],
    mistakes: ['Hyperextension forcée', 'Relever la tête'],
  }),
  E('prone_hold', 'Gainage dorsal (superman tenu)', 'lower_back', ['glutes', 'traps'], 'core_anti', 2, [], {
    mode: 'time',
    defaultRange: [15, 30],
    regression: 'superman',
    cues: ['Tiens la position superman basse', 'Regard vers le sol', 'Respire'],
    mistakes: ['Monter trop haut', 'Bloquer la respiration'],
  }),

  // ================= FESSIERS =================
  E('glute_bridge', 'Pont fessier', 'glutes', ['hamstrings', 'lower_back'], 'hinge', 1, [], {
    defaultRange: [12, 20],
    progression: 'single_leg_glute_bridge',
    cues: ['Pieds à plat près des fesses', 'Pousse dans les talons', 'Serre les fessiers 1 s en haut'],
    mistakes: ['Cambrer au lieu de pousser avec les hanches', 'Genoux qui s’écartent'],
  }),
  E('single_leg_glute_bridge', 'Pont fessier unilatéral', 'glutes', ['hamstrings'], 'hinge', 2, [], {
    defaultRange: [10, 15],
    unilateral: true,
    progression: 'single_leg_hip_thrust',
    regression: 'glute_bridge',
    cues: ['Une jambe tendue en l’air', 'Bassin parfaitement horizontal', 'Chaque côté'],
    mistakes: ['Bassin qui bascule', 'Pousser avec les orteils'],
  }),
  E('hip_thrust', 'Hip thrust', 'glutes', ['hamstrings', 'quads'], 'hinge', 2, [], {
    defaultRange: [12, 20],
    progression: 'single_leg_hip_thrust',
    regression: 'glute_bridge',
    cues: ['Haut du dos sur le bord d’un canapé ou lit', 'Menton rentré', 'Hanches en extension complète'],
    mistakes: ['Cambrer en haut', 'Support qui glisse'],
  }),
  E('single_leg_hip_thrust', 'Hip thrust unilatéral', 'glutes', ['hamstrings'], 'hinge', 3, [], {
    defaultRange: [8, 15],
    unilateral: true,
    regression: 'hip_thrust',
    cues: ['Dos sur un canapé', 'Une jambe en l’air', 'Contrôle la descente'],
    mistakes: ['Bassin qui tourne', 'Amplitude réduite'],
  }),
  E('db_hip_thrust', 'Hip thrust haltère', 'glutes', ['hamstrings'], 'hinge', 2, ['dumbbells'], {
    loadable: true,
    defaultRange: [8, 12],
    cues: ['Haltère posé sur les hanches (avec une serviette)', 'Dos sur canapé/banc', 'Pause 1 s en haut'],
    mistakes: ['Haltère instable', 'Hyperextension lombaire'],
  }),
  E('kb_swing', 'Kettlebell swing', 'glutes', ['hamstrings', 'lower_back', 'forearms'], 'hinge', 3, ['kettlebell'], {
    loadable: true,
    defaultRange: [12, 20],
    cues: ['Mouvement de charnière de hanche, pas un squat', 'Projette les hanches vers l’avant', 'Bras relâchés, la cloche monte à hauteur de poitrine'],
    mistakes: ['Lever avec les bras', 'Dos rond'],
  }),
  E('band_lateral_walk', 'Marche latérale élastique', 'glutes', ['adductors'], 'isolation', 1, ['bands'], {
    defaultRange: [12, 20],
    cues: ['Élastique autour des genoux ou chevilles', 'Demi-squat', 'Pas latéraux sans relâcher la tension'],
    mistakes: ['Pieds qui se touchent', 'Se redresser'],
  }),
  E('donkey_kick', 'Donkey kick', 'glutes', ['hamstrings'], 'isolation', 1, [], {
    defaultRange: [15, 20],
    unilateral: true,
    cues: ['À quatre pattes', 'Pousse le talon vers le plafond', 'Sans cambrer'],
    mistakes: ['Cambrer le bas du dos', 'Balancer la jambe'],
  }),

  // ================= QUADRICEPS =================
  E('chair_squat', 'Squat assis-debout', 'quads', ['glutes'], 'squat', 1, ['chair'], {
    defaultRange: [10, 15],
    progression: 'bodyweight_squat',
    cues: ['Effleure la chaise avec les fesses', 'Genoux dans l’axe des pieds', 'Relève-toi sans élan'],
    mistakes: ['S’affaler sur la chaise', 'Genoux qui rentrent'],
  }),
  E('bodyweight_squat', 'Squat', 'quads', ['glutes', 'adductors'], 'squat', 1, [], {
    defaultRange: [12, 20],
    progression: 'split_squat',
    regression: 'chair_squat',
    cues: ['Pieds largeur d’épaules', 'Descends en poussant les hanches en arrière', 'Poitrine haute, talons au sol'],
    mistakes: ['Talons qui décollent', 'Genoux vers l’intérieur'],
  }),
  E('wall_sit', 'Chaise contre le mur', 'quads', ['glutes'], 'squat', 1, [], {
    mode: 'time',
    defaultRange: [30, 60],
    cues: ['Dos contre le mur', 'Cuisses parallèles au sol', 'Respire'],
    mistakes: ['Genoux devant les orteils excessivement', 'Mains sur les cuisses'],
  }),
  E('split_squat', 'Squat fendu', 'quads', ['glutes', 'adductors'], 'lunge', 2, [], {
    defaultRange: [8, 15],
    unilateral: true,
    progression: 'bulgarian_split_squat',
    regression: 'bodyweight_squat',
    cues: ['Grande fente statique', 'Descends le genou arrière vers le sol', 'Buste droit'],
    mistakes: ['Genou avant qui rentre', 'Pas trop court'],
  }),
  E('reverse_lunge', 'Fentes arrière', 'quads', ['glutes', 'hamstrings'], 'lunge', 2, [], {
    defaultRange: [8, 15],
    unilateral: true,
    progression: 'bulgarian_split_squat',
    regression: 'split_squat',
    cues: ['Recule d’un grand pas', 'Genou arrière près du sol', 'Pousse avec la jambe avant'],
    mistakes: ['Déséquilibre', 'Buste qui s’effondre'],
  }),
  E('forward_lunge', 'Fentes avant', 'quads', ['glutes'], 'lunge', 2, [], {
    defaultRange: [8, 15],
    unilateral: true,
    regression: 'reverse_lunge',
    cues: ['Grand pas en avant', 'Genou avant au-dessus de la cheville', 'Repousse fort pour revenir'],
    mistakes: ['Pas trop court', 'Genou qui tape au sol'],
  }),
  E('bulgarian_split_squat', 'Squat bulgare', 'quads', ['glutes', 'adductors'], 'lunge', 3, ['chair'], {
    defaultRange: [8, 12],
    unilateral: true,
    progression: 'db_bulgarian_split_squat',
    regression: 'split_squat',
    cues: ['Pied arrière posé sur une chaise', 'Descends à la verticale', 'Buste légèrement penché = plus de fessiers'],
    mistakes: ['Pied avant trop proche', 'Chaise instable'],
  }),
  E('db_bulgarian_split_squat', 'Squat bulgare haltères', 'quads', ['glutes', 'adductors'], 'lunge', 3, ['dumbbells', 'chair'], {
    loadable: true,
    defaultRange: [8, 12],
    unilateral: true,
    regression: 'bulgarian_split_squat',
    cues: ['Haltères le long du corps', 'Même technique que le squat bulgare', 'Contrôle la descente'],
    mistakes: ['Charge trop lourde pour l’équilibre', 'Genou qui rentre'],
  }),
  E('step_up', 'Montées sur chaise', 'quads', ['glutes'], 'lunge', 2, ['chair'], {
    defaultRange: [8, 15],
    unilateral: true,
    cues: ['Chaise stable contre un mur', 'Monte en poussant sur la jambe haute', 'Descente contrôlée'],
    mistakes: ['Pousser avec la jambe au sol', 'Chaise qui bascule'],
  }),
  E('cyclist_squat', 'Squat talons surélevés', 'quads', ['glutes'], 'squat', 2, [], {
    defaultRange: [12, 20],
    cues: ['Talons sur un livre épais ou une marche', 'Pieds serrés', 'Genoux vers l’avant, buste droit'],
    mistakes: ['Support glissant', 'Descente rapide'],
  }),
  E('goblet_squat', 'Goblet squat haltère', 'quads', ['glutes', 'adductors'], 'squat', 2, ['dumbbells'], {
    loadable: true,
    defaultRange: [8, 12],
    cues: ['Haltère tenu contre la poitrine', 'Coudes entre les genoux en bas', 'Dos droit'],
    mistakes: ['Dos rond', 'Talons qui décollent'],
  }),
  E('kb_goblet_squat', 'Goblet squat kettlebell', 'quads', ['glutes', 'adductors'], 'squat', 2, ['kettlebell'], {
    loadable: true,
    defaultRange: [8, 12],
    cues: ['Kettlebell tenue par les cornes', 'Descente profonde et contrôlée', 'Genoux dans l’axe'],
    mistakes: ['Pencher en avant', 'Amplitude réduite'],
  }),
  E('backpack_squat', 'Squat sac à dos', 'quads', ['glutes'], 'squat', 2, ['backpack'], {
    loadable: true,
    defaultRange: [10, 15],
    cues: ['Sac lesté porté devant ou dans le dos', 'Même technique que le squat', 'Augmente le poids progressivement'],
    mistakes: ['Sac qui bouge', 'Genoux qui rentrent'],
  }),
  E('assisted_pistol', 'Pistol squat assisté', 'quads', ['glutes'], 'squat', 4, [], {
    defaultRange: [5, 10],
    unilateral: true,
    regression: 'bulgarian_split_squat',
    cues: ['Tiens un cadre de porte', 'Une jambe devant, descends sur l’autre', 'Aide-toi des bras au minimum'],
    mistakes: ['Talon qui décolle', 'Genou qui rentre'],
  }),
  E('jump_squat', 'Squat sauté', 'quads', ['glutes', 'calves'], 'squat', 3, [], {
    defaultRange: [8, 12],
    regression: 'bodyweight_squat',
    cues: ['Squat puis saut explosif', 'Réception souple sur l’avant du pied', 'Enchaîne sans rebond sec'],
    mistakes: ['Réception jambes tendues', 'Genoux qui rentrent'],
  }),

  // ================= ISCHIO-JAMBIERS =================
  E('single_leg_rdl', 'Soulevé de terre roumain unilatéral', 'hamstrings', ['glutes', 'lower_back'], 'hinge', 2, [], {
    defaultRange: [8, 12],
    unilateral: true,
    progression: 'db_single_leg_rdl',
    cues: ['Genou d’appui légèrement fléchi', 'Bascule le buste, jambe libre tendue derrière', 'Dos plat'],
    mistakes: ['Dos rond', 'Bassin qui s’ouvre'],
  }),
  E('db_rdl', 'Soulevé de terre roumain haltères', 'hamstrings', ['glutes', 'lower_back', 'forearms'], 'hinge', 2, ['dumbbells'], {
    loadable: true,
    defaultRange: [8, 12],
    cues: ['Haltères près des cuisses', 'Pousse les fesses en arrière', 'Descends jusqu’à l’étirement des ischios, dos plat'],
    mistakes: ['Dos rond', 'Plier les genoux comme un squat'],
  }),
  E('db_single_leg_rdl', 'SDT roumain unilatéral haltère', 'hamstrings', ['glutes'], 'hinge', 3, ['dumbbells'], {
    loadable: true,
    defaultRange: [8, 12],
    unilateral: true,
    regression: 'single_leg_rdl',
    cues: ['Haltère dans la main opposée à la jambe d’appui', 'Bascule lente', 'Bassin horizontal'],
    mistakes: ['Rotation du bassin', 'Genou verrouillé'],
  }),
  E('backpack_rdl', 'Soulevé de terre roumain sac à dos', 'hamstrings', ['glutes', 'lower_back'], 'hinge', 2, ['backpack'], {
    loadable: true,
    defaultRange: [10, 15],
    cues: ['Sac tenu devant par les bretelles', 'Charnière de hanche, dos plat', 'Remonte en serrant les fessiers'],
    mistakes: ['Dos rond', 'Sac loin du corps'],
  }),
  E('kb_deadlift', 'Soulevé de terre kettlebell', 'hamstrings', ['glutes', 'quads', 'lower_back'], 'hinge', 2, ['kettlebell'], {
    loadable: true,
    defaultRange: [8, 12],
    cues: ['Kettlebell entre les pieds', 'Dos plat, bras tendus', 'Pousse le sol et avance les hanches'],
    mistakes: ['Dos rond', 'Tirer avec les bras'],
  }),
  E('sliding_leg_curl', 'Leg curl glissé (serviette)', 'hamstrings', ['glutes'], 'isolation', 3, [], {
    defaultRange: [6, 12],
    regression: 'hamstring_bridge',
    cues: ['Talons sur une serviette (sol lisse)', 'Hanches en l’air', 'Ramène les talons vers les fesses'],
    mistakes: ['Hanches qui tombent', 'Crampes : réduis l’amplitude'],
  }),
  E('hamstring_bridge', 'Pont ischios pieds sur chaise', 'hamstrings', ['glutes'], 'hinge', 2, ['chair'], {
    defaultRange: [10, 15],
    progression: 'sliding_leg_curl',
    cues: ['Talons sur une chaise, jambes presque tendues', 'Monte les hanches', 'Contrôle la descente'],
    mistakes: ['Cambrer', 'Chaise qui glisse'],
  }),
  E('band_leg_curl', 'Leg curl élastique', 'hamstrings', [], 'isolation', 1, ['bands'], {
    defaultRange: [15, 20],
    cues: ['Élastique ancré bas, autour de la cheville', 'À plat ventre ou debout', 'Ramène le talon vers la fesse'],
    mistakes: ['Cambrer', 'Relâcher trop vite'],
  }),

  // ================= ADDUCTEURS =================
  E('sumo_squat', 'Squat sumo', 'adductors', ['quads', 'glutes'], 'squat', 1, [], {
    defaultRange: [12, 20],
    cues: ['Pieds très écartés, pointes vers l’extérieur', 'Genoux dans l’axe des pieds', 'Descente profonde'],
    mistakes: ['Genoux qui rentrent', 'Buste qui s’effondre'],
  }),
  E('db_sumo_squat', 'Squat sumo haltère', 'adductors', ['quads', 'glutes'], 'squat', 2, ['dumbbells'], {
    loadable: true,
    defaultRange: [10, 15],
    cues: ['Haltère tenu entre les jambes', 'Dos droit', 'Pousse les genoux vers l’extérieur'],
    mistakes: ['Dos rond', 'Amplitude réduite'],
  }),
  E('side_lunge', 'Fente latérale', 'adductors', ['quads', 'glutes'], 'lunge', 2, [], {
    defaultRange: [8, 12],
    unilateral: true,
    cues: ['Grand pas sur le côté', 'Jambe opposée tendue', 'Fesses en arrière, pied à plat'],
    mistakes: ['Genou devant les orteils excessivement', 'Talon qui décolle'],
  }),
  E('adductor_squeeze', 'Pont avec serrage (coussin)', 'adductors', ['glutes'], 'isolation', 1, [], {
    mode: 'time',
    defaultRange: [20, 40],
    cues: ['Coussin serré entre les genoux', 'Position de pont fessier', 'Serre fort en maintenant'],
    mistakes: ['Relâcher le serrage', 'Cambrer'],
  }),
  E('copenhagen_short', 'Copenhagen (genou sur chaise)', 'adductors', ['obliques'], 'core_anti', 3, ['chair'], {
    mode: 'time',
    defaultRange: [10, 25],
    unilateral: true,
    regression: 'adductor_squeeze',
    cues: ['Planche latérale, genou du dessus sur la chaise', 'Soulève les hanches', 'Commence court (10 s)'],
    mistakes: ['Hanches basses', 'Douleur à l’aine : arrête'],
  }),

  // ================= MOLLETS =================
  E('calf_raise', 'Mollets debout', 'calves', [], 'calf', 1, [], {
    defaultRange: [15, 25],
    progression: 'single_leg_calf_raise',
    cues: ['Sur une marche, talons dans le vide', 'Monte le plus haut possible', 'Descente lente en étirement'],
    mistakes: ['Rebondir', 'Amplitude partielle'],
  }),
  E('single_leg_calf_raise', 'Mollets unilatéral', 'calves', [], 'calf', 2, [], {
    defaultRange: [10, 20],
    unilateral: true,
    regression: 'calf_raise',
    cues: ['Une jambe sur une marche', 'Tiens-toi au mur pour l’équilibre', 'Pause 1 s en haut'],
    mistakes: ['Plier le genou', 'Rythme trop rapide'],
  }),
  E('db_calf_raise', 'Mollets haltères', 'calves', [], 'calf', 2, ['dumbbells'], {
    loadable: true,
    defaultRange: [12, 20],
    cues: ['Haltères en main, sur une marche', 'Amplitude complète', 'Pause en haut'],
    mistakes: ['Rebond', 'Genoux qui plient'],
  }),
  E('backpack_calf_raise', 'Mollets sac à dos', 'calves', [], 'calf', 2, ['backpack'], {
    loadable: true,
    defaultRange: [15, 20],
    cues: ['Sac lesté sur le dos', 'Sur une marche', 'Contrôle la descente'],
    mistakes: ['Rebond', 'Amplitude partielle'],
  }),
];

export const exerciseById = (id: string): Exercise | undefined => EXERCISES.find((e) => e.id === id);

export const getExercise = (id: string): Exercise => {
  const ex = exerciseById(id);
  if (!ex) throw new Error(`Exercice inconnu : ${id}`);
  return ex;
};
