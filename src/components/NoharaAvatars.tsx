import React from "react";

export interface AvatarProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number;
}

// 1. Shin-chan (ชินจัง)
export function ShinchanAvatar({ className = "w-10 h-10", size, ...props }: AvatarProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      className={className}
      {...props}
    >
      {/* Background circle badge */}
      <circle cx="50" cy="50" r="46" fill="#FEE580" stroke="#1E293B" strokeWidth="4" />
      {/* Shirt */}
      <path d="M22 84C22 74 34 68 50 68C66 68 78 74 78 84V96H22V84Z" fill="#E53935" stroke="#1E293B" strokeWidth="4" />
      <path d="M42 68L50 78L58 68" stroke="#1E293B" strokeWidth="3" fill="#FFE082" />
      {/* Head / Ears */}
      <circle cx="76" cy="48" r="8" fill="#FCD7B0" stroke="#1E293B" strokeWidth="3.5" />
      <path d="M74 46C76 48 76 52 72 54" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
      {/* Cheek and Face */}
      <path
        d="M26 44C26 30 38 22 56 22C72 22 76 34 76 48C76 62 66 68 52 68C36 68 26 58 26 44Z"
        fill="#FCD7B0"
        stroke="#1E293B"
        strokeWidth="4"
      />
      {/* Iconic Potato Cheek bulge */}
      <path
        d="M26 44C21 47 18 53 23 59C28 65 37 66 44 66"
        fill="#FCD7B0"
        stroke="#1E293B"
        strokeWidth="3.5"
      />
      {/* Hair */}
      <path
        d="M26 40C26 28 38 20 56 20C71 20 76 30 76 36C71 31 60 29 46 32C35 34 29 38 26 40Z"
        fill="#1E293B"
      />
      {/* Iconic Thick Shin-chan Eyebrow */}
      <path
        d="M32 35C38 31 46 32 54 36"
        stroke="#1E293B"
        strokeWidth="6"
        strokeLinecap="round"
      />
      {/* Big Round Shin-chan Eye */}
      <ellipse cx="44" cy="45" rx="5.5" ry="6.5" fill="#1E293B" />
      <circle cx="42" cy="43" r="2" fill="#FFFFFF" />
      {/* Rosy Cheek */}
      <ellipse cx="32" cy="52" rx="4.5" ry="3.5" fill="#FF8A80" opacity="0.8" />
      {/* Cute Smirk Mouth */}
      <path
        d="M40 55C44 59 50 57 52 54"
        stroke="#1E293B"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

// 2. Himawari (ฮิมาวาริ)
export function HimawariAvatar({ className = "w-10 h-10", size, ...props }: AvatarProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      className={className}
      {...props}
    >
      {/* Background circle badge */}
      <circle cx="50" cy="50" r="46" fill="#FFE0B2" stroke="#1E293B" strokeWidth="4" />
      {/* Baby Bib */}
      <path d="M26 82C26 72 36 68 50 68C64 68 74 72 74 82V96H26V82Z" fill="#FDD835" stroke="#1E293B" strokeWidth="4" />
      <circle cx="50" cy="78" r="3.5" fill="#E53935" />
      {/* Head */}
      <circle cx="50" cy="46" r="25" fill="#FFE0B2" stroke="#1E293B" strokeWidth="4" />
      <circle cx="25" cy="48" r="5" fill="#FFE0B2" stroke="#1E293B" strokeWidth="3" />
      <circle cx="75" cy="48" r="5" fill="#FFE0B2" stroke="#1E293B" strokeWidth="3" />
      {/* Orange Swirly Hair Tuft */}
      <path
        d="M48 22C46 16 54 12 58 16C62 20 54 24 50 24"
        stroke="#E65100"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M34 26C30 30 36 34 40 32C36 28 40 24 44 26"
        stroke="#E65100"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* Sparkly Eyes */}
      <circle cx="40" cy="44" r="4.5" fill="#1E293B" />
      <circle cx="38.5" cy="42.5" r="1.5" fill="#FFFFFF" />
      <circle cx="60" cy="44" r="4.5" fill="#1E293B" />
      <circle cx="58.5" cy="42.5" r="1.5" fill="#FFFFFF" />
      {/* Eyelashes */}
      <path d="M36 38L34 36" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M64 38L66 36" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
      {/* Rosy Cheeks */}
      <circle cx="32" cy="50" r="4" fill="#FF8A80" opacity="0.8" />
      <circle cx="68" cy="50" r="4" fill="#FF8A80" opacity="0.8" />
      {/* Cute Open Mouth */}
      <path d="M46 52C46 56 54 56 54 52" fill="#E53935" stroke="#1E293B" strokeWidth="2.5" />
    </svg>
  );
}

// 3. Shiro (เจ้าขาว)
export function ShiroAvatar({ className = "w-10 h-10", size, ...props }: AvatarProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      className={className}
      {...props}
    >
      {/* Background circle badge */}
      <circle cx="50" cy="50" r="46" fill="#E0F7FA" stroke="#1E293B" strokeWidth="4" />
      {/* Blue Collar */}
      <path d="M30 76C30 72 40 70 50 70C60 70 70 72 70 76V84H30V76Z" fill="#00BCD4" stroke="#1E293B" strokeWidth="4" />
      {/* Floppy Ears */}
      <path d="M22 36C16 42 16 52 24 54C28 50 28 40 26 36Z" fill="#FFFFFF" stroke="#1E293B" strokeWidth="4" />
      <path d="M78 36C84 42 84 52 76 54C72 50 72 40 74 36Z" fill="#FFFFFF" stroke="#1E293B" strokeWidth="4" />
      {/* Cloud-shaped Fluffy Head */}
      <ellipse cx="50" cy="48" rx="28" ry="24" fill="#FFFFFF" stroke="#1E293B" strokeWidth="4" />
      <ellipse cx="36" cy="40" rx="14" ry="12" fill="#FFFFFF" />
      <ellipse cx="64" cy="40" rx="14" ry="12" fill="#FFFFFF" />
      <ellipse cx="50" cy="34" rx="16" ry="12" fill="#FFFFFF" />
      {/* Dot Eyes */}
      <circle cx="42" cy="46" r="3.5" fill="#1E293B" />
      <circle cx="58" cy="46" r="3.5" fill="#1E293B" />
      {/* Black Triangle/Dot Nose */}
      <ellipse cx="50" cy="52" rx="3.5" ry="2.5" fill="#1E293B" />
      {/* Gentle Dog Smile */}
      <path d="M46 56C48 58 52 58 54 56" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// 4. Hiroshi (พ่อฮิโรชิ)
export function HiroshiAvatar({ className = "w-10 h-10", size, ...props }: AvatarProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      className={className}
      {...props}
    >
      {/* Background circle badge */}
      <circle cx="50" cy="50" r="46" fill="#E8EAF6" stroke="#1E293B" strokeWidth="4" />
      {/* Suit & Tie */}
      <path d="M22 84C22 72 34 68 50 68C66 68 78 72 78 84V96H22V84Z" fill="#3F51B5" stroke="#1E293B" strokeWidth="4" />
      <path d="M44 68L50 78L56 68" fill="#FFFFFF" stroke="#1E293B" strokeWidth="2.5" />
      <path d="M48 78L50 96L52 78Z" fill="#E53935" stroke="#1E293B" strokeWidth="2.5" />
      {/* Head / Rectangular Jaw */}
      <path
        d="M32 36C32 26 40 24 50 24C60 24 68 26 68 36V54C68 62 60 66 50 66C40 66 32 62 32 54V36Z"
        fill="#FCD7B0"
        stroke="#1E293B"
        strokeWidth="4"
      />
      {/* Wavy Messy Hair */}
      <path
        d="M28 34C28 22 36 18 50 18C64 18 72 22 72 34C68 26 60 24 50 24C40 24 32 26 28 34Z"
        fill="#5D4037"
        stroke="#1E293B"
        strokeWidth="3.5"
      />
      {/* Stubble / Beard dots */}
      <circle cx="42" cy="60" r="1" fill="#757575" />
      <circle cx="46" cy="62" r="1" fill="#757575" />
      <circle cx="50" cy="63" r="1" fill="#757575" />
      <circle cx="54" cy="62" r="1" fill="#757575" />
      <circle cx="58" cy="60" r="1" fill="#757575" />
      {/* Bushy Straight Eyebrows */}
      <rect x="36" y="32" width="10" height="3.5" rx="1.5" fill="#1E293B" />
      <rect x="54" y="32" width="10" height="3.5" rx="1.5" fill="#1E293B" />
      {/* Tired-yet-smiling eyes */}
      <path d="M37 40C39 38 43 38 45 40" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M55 40C57 38 61 38 63 40" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
      {/* Big Nose */}
      <path d="M50 40V48H54" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Friendly Grin */}
      <path d="M42 54C46 58 54 58 58 54" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// 5. Misae (แม่มิซาเอะ)
export function MisaeAvatar({ className = "w-10 h-10", size, ...props }: AvatarProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      className={className}
      {...props}
    >
      {/* Background circle badge */}
      <circle cx="50" cy="50" r="46" fill="#FCE4EC" stroke="#1E293B" strokeWidth="4" />
      {/* Dress */}
      <path d="M22 84C22 72 34 68 50 68C66 68 78 72 78 84V96H22V84Z" fill="#EC407A" stroke="#1E293B" strokeWidth="4" />
      {/* Pearl Necklace */}
      <circle cx="44" cy="70" r="2.5" fill="#FFFFFF" stroke="#1E293B" strokeWidth="1" />
      <circle cx="50" cy="71" r="2.5" fill="#FFFFFF" stroke="#1E293B" strokeWidth="1" />
      <circle cx="56" cy="70" r="2.5" fill="#FFFFFF" stroke="#1E293B" strokeWidth="1" />
      {/* Big Voluminous Hair Puffs */}
      <ellipse cx="28" cy="38" rx="14" ry="16" fill="#6D4C41" stroke="#1E293B" strokeWidth="4" />
      <ellipse cx="72" cy="38" rx="14" ry="16" fill="#6D4C41" stroke="#1E293B" strokeWidth="4" />
      {/* Head */}
      <ellipse cx="50" cy="46" rx="20" ry="22" fill="#FCD7B0" stroke="#1E293B" strokeWidth="4" />
      {/* Bangs */}
      <path
        d="M32 36C36 28 46 26 68 32C62 26 50 24 38 28C32 30 32 34 32 36Z"
        fill="#6D4C41"
      />
      {/* Eyes & Eyelashes */}
      <ellipse cx="42" cy="44" rx="4" ry="5" fill="#1E293B" />
      <circle cx="41" cy="42" r="1.5" fill="#FFFFFF" />
      <path d="M38 38L36 36" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="58" cy="44" rx="4" ry="5" fill="#1E293B" />
      <circle cx="57" cy="42" r="1.5" fill="#FFFFFF" />
      <path d="M62 38L64 36" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
      {/* Red Lipstick Smile */}
      <path d="M44 54C47 58 53 58 56 54" stroke="#E53935" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// 6. Buriburizaemon (บูริบูริซาเอมอน)
export function BuriAvatar({ className = "w-10 h-10", size, ...props }: AvatarProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      className={className}
      {...props}
    >
      {/* Background circle badge */}
      <circle cx="50" cy="50" r="46" fill="#F8BBD0" stroke="#1E293B" strokeWidth="4" />
      {/* Katana hilt peeking behind shoulder */}
      <path d="M22 18L32 32" stroke="#5D4037" strokeWidth="6" strokeLinecap="round" />
      <rect x="28" y="24" width="8" height="4" transform="rotate(45 28 24)" fill="#FFD54F" stroke="#1E293B" strokeWidth="2" />
      {/* Pig Ears */}
      <path d="M30 32L38 18L44 30Z" fill="#F48FB1" stroke="#1E293B" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M70 32L62 18L56 30Z" fill="#F48FB1" stroke="#1E293B" strokeWidth="3.5" strokeLinejoin="round" />
      {/* Pig Head */}
      <circle cx="50" cy="50" r="26" fill="#F8BBD0" stroke="#1E293B" strokeWidth="4" />
      {/* Squinting Hero Eyes */}
      <path d="M36 42L44 45" stroke="#1E293B" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M64 42L56 45" stroke="#1E293B" strokeWidth="3.5" strokeLinecap="round" />
      {/* Big Pig Snout */}
      <ellipse cx="50" cy="54" rx="12" ry="9" fill="#F06292" stroke="#1E293B" strokeWidth="3.5" />
      <ellipse cx="46" cy="54" rx="2.5" ry="3.5" fill="#1E293B" />
      <ellipse cx="54" cy="54" rx="2.5" ry="3.5" fill="#1E293B" />
    </svg>
  );
}

// 7. Action Kamen (หน้ากากแอคชั่น)
export function ActionKamenAvatar({ className = "w-10 h-10", size, ...props }: AvatarProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      className={className}
      {...props}
    >
      <circle cx="50" cy="50" r="46" fill="#C8E6C9" stroke="#1E293B" strokeWidth="4" />
      {/* Mask and Helmet */}
      <path d="M26 44C26 30 36 22 50 22C64 22 74 30 74 44V60C74 66 66 70 50 70C34 70 26 66 26 60V44Z" fill="#1976D2" stroke="#1E293B" strokeWidth="4" />
      {/* Winged Green Mask front */}
      <path d="M20 40L36 48L50 36L64 48L80 40L68 56H32L20 40Z" fill="#43A047" stroke="#1E293B" strokeWidth="3.5" strokeLinejoin="round" />
      {/* Eyes through mask */}
      <ellipse cx="40" cy="46" rx="4" ry="3" fill="#FFF59D" stroke="#1E293B" strokeWidth="2" />
      <ellipse cx="60" cy="46" rx="4" ry="3" fill="#FFF59D" stroke="#1E293B" strokeWidth="2" />
      {/* Lower chin & heroic smile */}
      <path d="M38 58C42 66 58 66 62 58" fill="#FCD7B0" stroke="#1E293B" strokeWidth="3" />
      <path d="M44 62C47 64 53 64 56 62" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// 8. Chocobi Star Icon
export function ChocobiStar({ className = "w-6 h-6", size, ...props }: AvatarProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      className={className}
      {...props}
    >
      <polygon
        points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
        fill="#FDD835"
        stroke="#1E293B"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="11" r="1" fill="#1E293B" />
      <circle cx="14" cy="11" r="1" fill="#1E293B" />
      <path d="M11 13C11.5 14 12.5 14 13 13" stroke="#1E293B" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}
