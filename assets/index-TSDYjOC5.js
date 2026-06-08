(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=[{theme:`قهوة وتراث`,letters:[`ق`,`ه`,`و`,`ة`,`ب`,`ن`,`د`],center:`ق`,words:[`قهوة`,`قهوه`,`دلة`,`بن`,`نقد`,`وقد`,`قود`,`دق`,`قند`,`ندق`]},{theme:`مدن سعودية`,letters:[`ر`,`ي`,`ا`,`ض`,`ج`,`د`,`ة`],center:`ر`,words:[`رياض`,`الرياض`,`جدة`,`دار`,`دير`,`دراية`,`راد`,`دور`,`يرد`,`رد`]},{theme:`السفر والطرق`,letters:[`ط`,`ر`,`ي`,`ق`,`س`,`ف`,`ر`],center:`ط`,words:[`طريق`,`طرق`,`طير`,`فطر`,`قطر`,`سطر`,`طرس`,`طفر`,`رطب`,`طيف`]},{theme:`البحر وجدة`,letters:[`ب`,`ح`,`ر`,`ج`,`د`,`ة`,`م`],center:`ب`,words:[`بحر`,`بحري`,`برج`,`برد`,`بدر`,`مبحر`,`بحره`,`حبر`,`درب`,`بدم`]},{theme:`العقار والأرض`,letters:[`ا`,`ر`,`ض`,`م`,`ل`,`ك`,`ة`],center:`ر`,words:[`ارض`,`أرض`,`عقار`,`ملك`,`مراد`,`رماد`,`كرم`,`مركز`,`رمل`,`رملة`]},{theme:`رمضان`,letters:[`ص`,`و`,`م`,`ر`,`ح`,`ا`,`ن`],center:`ص`,words:[`صوم`,`صحن`,`صاروخ`,`صاح`,`حرص`,`نص`,`صنم`,`صرح`,`صام`,`مصون`]},{theme:`كورة`,letters:[`ك`,`ر`,`ة`,`ه`,`د`,`ف`,`ل`],center:`ك`,words:[`كرة`,`كوره`,`هدفك`,`كف`,`ركل`,`درك`,`كر`,`فكر`,`كهل`,`كل`]},{theme:`الرياض الحديثة`,letters:[`م`,`ل`,`ك`,`س`,`ا`,`ن`,`ة`],center:`م`,words:[`ملك`,`مكان`,`ملاك`,`مسك`,`مكة`,`مالك`,`مناسك`,`مسكن`,`مسمار`,`منا`]},{theme:`العمل والدوام`,letters:[`ع`,`م`,`ل`,`د`,`و`,`ا`,`م`],center:`ع`,words:[`عمل`,`عامل`,`معد`,`عود`,`وعد`,`عدل`,`علم`,`عالم`,`معاد`,`دعم`]},{theme:`الشتاء`,letters:[`ش`,`ت`,`ا`,`ء`,`ب`,`ر`,`د`],center:`ش`,words:[`شتاء`,`برد`,`بشر`,`رشد`,`شرب`,`دش`,`شارد`,`شرط`,`تباشير`,`شات`]}];function t(e){return String(e||``).trim().replace(/[إأآٱ]/g,`ا`).replace(/ى/g,`ي`).replace(/ؤ/g,`و`).replace(/ئ/g,`ي`).replace(/ة/g,`ه`).replace(/[ًٌٍَُِّْـ\s]/g,``).toLowerCase()}function n(t=new Date){let n=new Date(Date.UTC(2026,0,1)),r=new Date(Date.UTC(t.getFullYear(),t.getMonth(),t.getDate()));return e[(Math.floor((r-n)/864e5)%e.length+e.length)%e.length]}function r(e,n){let r=n.map(t).join(``),i={};for(let e of r)i[e]=(i[e]||0)+1;for(let n of t(e))if(i[n]=(i[n]||0)-1,i[n]<0)return!1;return!0}function i(e,n){let i=t(e);return i.length<2?{ok:!1,reason:`الكلمة قصيرة`}:i.includes(t(n.center))?r(i,n.letters)?new Set(n.words.map(t)).has(i)?{ok:!0}:{ok:!1,reason:`كلمة غير موجودة في لغز اليوم`}:{ok:!1,reason:`استخدم الحروف الظاهرة فقط`}:{ok:!1,reason:`لازم تستخدم حرف ${n.center}`}}var a=`https://azoz055.github.io/saudi-word-challenge/`,o=n(),s=d(o),c=``,l=0;function u(e){return`swc:`+e.theme+`:`+e.letters.join(``)}function d(e){try{return new Set(JSON.parse(localStorage.getItem(u(e))||`[]`))}catch{return new Set}}function f(){localStorage.setItem(u(o),JSON.stringify([...s]))}function p(){return[...s].reduce((e,n)=>e+Math.max(10,t(n).length*7),0)+l*3}function m(){let e=s.size/o.words.length;return e===1?`أسطورة الكلمات`:e>=.75?`خبير تحديات`:e>=.45?`لاعب قوي`:`بداية موفقة`}function h(){let t=Math.round(s.size/o.words.length*100);document.querySelector(`#app`).innerHTML=`
    <main class="shell">
      <section class="hero">
        <div class="brand">🇸🇦 تحدي كلمات السعودية</div>
        <h1>كوّن كلمات من الحروف وتحدى أصحابك</h1>
        <p>لغز عربي خفيف للجوال. العب يومياً، ارفع نتيجتك، وشارك التحدي.</p>
        <div class="daily-chip">موضوع اليوم: <b>${o.theme}</b></div>
      </section>

      <section class="ad-slot top" aria-label="ad placeholder"><span>مساحة إعلان مستقبلية</span></section>

      <section class="game-card">
        <div class="stats">
          <div><strong>${p()}</strong><span>نقطة</span></div>
          <div><strong>${s.size}/${o.words.length}</strong><span>كلمة</span></div>
          <div><strong>${t}%</strong><span>إنجاز</span></div>
        </div>
        <div class="progress"><i style="width:${t}%"></i></div>
        <div class="input" id="wordInput">${c||`اضغط الحروف`}</div>
        <div class="letters">
          ${o.letters.map((e,t)=>`<button class="letter ${e===o.center?`center`:``}" data-letter="${e}">${e}</button>`).join(``)}
        </div>
        <div class="actions">
          <button id="submit">تحقق</button>
          <button id="back">حذف</button>
          <button id="shuffle">خلط</button>
          <button id="random">لغز عشوائي</button>
        </div>
        <div id="toast" class="toast"></div>
      </section>

      <section class="found-card">
        <div class="found-head"><h2>كلماتك</h2><span>${m()}</span></div>
        <div class="found-list">${[...s].sort((e,t)=>t.length-e.length).map(e=>`<b>${e}</b>`).join(``)||`<em>ابدأ بأول كلمة...</em>`}</div>
        <button class="share" id="share">شارك نتيجتك</button>
      </section>

      <section class="content">
        <h2>كيف تلعب؟</h2>
        <p>اختر الحروف لتكوين كلمة. يجب أن تحتوي الكلمة على الحرف الذهبي. كلما وجدت كلمات أكثر ارتفعت نتيجتك.</p>
        <h2>ليش اللعبة؟</h2>
        <p>تحدي سريع ومناسب للمشاركة في واتساب وإكس. كل يوم لغز جديد بطابع سعودي وعربي.</p>
      </section>

      <footer>
        <a href="./privacy.html">سياسة الخصوصية</a>
        <span>جاهزة لإضافة AdSense بعد ربط حساب الإعلانات</span>
      </footer>
    </main>`,document.querySelectorAll(`.letter`).forEach(e=>e.addEventListener(`click`,()=>{c+=e.dataset.letter,h()})),document.querySelector(`#submit`).addEventListener(`click`,_),document.querySelector(`#back`).addEventListener(`click`,()=>{c=c.slice(0,-1),h()}),document.querySelector(`#shuffle`).addEventListener(`click`,()=>{o.letters.sort(()=>Math.random()-.5),h()}),document.querySelector(`#random`).addEventListener(`click`,()=>{o=e[Math.floor(Math.random()*e.length)],s=d(o),c=``,h()}),document.querySelector(`#share`).addEventListener(`click`,v)}function g(e,t=!1){let n=document.querySelector(`#toast`);n.textContent=e,n.className=`toast show `+(t?`good`:`bad`),setTimeout(()=>n.className=`toast`,1200)}function _(){let e=i(c,o),n=t(c);if(!e.ok)return g(e.reason);if(s.has(n))return g(`موجودة قبل`);s.add(n),l+=1,f(),c=``,h(),g(`ممتاز! +`+l*3,!0)}async function v(){let e=`جبت ${p()} نقطة ووجدت ${s.size}/${o.words.length} في تحدي كلمات السعودية 🇸🇦
تقدر تهزمني؟ ${a}`;if(navigator.share)try{await navigator.share({title:`تحدي كلمات السعودية`,text:e,url:a});return}catch{}await navigator.clipboard.writeText(e),g(`تم نسخ رابط التحدي`,!0)}window.addEventListener(`keydown`,e=>{e.key===`Enter`&&_(),e.key===`Backspace`&&(c=c.slice(0,-1),h())}),h();