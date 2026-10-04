/* =========================================================
   config.js — الإعدادات (عدّل هنا فقط)
   ========================================================= */
window.AQX = window.AQX || {};
AQX.config = {
  blogUrl: "https://aqxfood.blogspot.com",

  // ملفات البيانات (مسارات نسبية على GitHub Pages)
  data: {
    recipes: "data/recipes.json",
    menus:   "data/menus.json",
    months:  "data/months.json"
  },

  // أسماء الأقسام (Labels) في بلوجر بالحرف كما هي في المدونة.
  // المفتاح = نوع الطبق في recipes.json، والقيمة = اسم القسم في بلوجر
  labels: {
    main:      "الأطباق الرئيسية",
    soup:      "الشوربة",
    salad:     "السلطات",
    appetizer: "المقبلات",
    drink:     "المشروبات",
    dessert:   "الحلويات",
    suhoor:    "السحور"
  },

  // الأقسام التي تظهر في «من أقسام المدونة» (اسم القسم في بلوجر)
  sectionTabs: [
    "وصفات رمضان", "الأطباق الرئيسية", "المقبلات", "الحلويات", "المشروبات", "وصفات سهلة"
  ],

  postsPerSection: 6,
  hijriOffset: 0,             // لو بداية رمضان عندك مختلفة بيوم: ضع 1 أو -1
  currency: "ج.م",
  iftarMinutes: 60,           // مقدار الوقت المقترح قبل الأذان لبدء التحضير (للتنبيه فقط)
  servingsOptions: [2, 4, 6, 8],
  defaultServings: 4,

  // true = اجلب صور وروابط الوصفات من بلوجر تلقائيًا بالبحث بالعنوان
  autoMatchBlogger: true
};
