<#-- Gabarit commun des pages Keycloak de Recrut (connexion, mot de passe oublié, vérification d'e-mail…).
     Reprend base/login/template.ftl (Keycloak 26.4) : mêmes sections et scripts, mise en page à deux colonnes
     (panneau de marque à gauche, formulaire à droite), sans PatternFly. -->
<#import "footer.ftl" as loginFooter>
<#macro logo taille=34>
    <svg width="${taille}" height="${taille}" viewBox="0 0 30 30" aria-hidden="true"><rect width="30" height="30" rx="9" fill="#2f6fb8"/><circle cx="11" cy="11" r="3.6" fill="#fff"/><circle cx="19" cy="19" r="3.6" fill="#a9cdf5"/><path d="M10 20L20 10" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg>
</#macro>
<#macro registrationLayout bodyClass="" displayInfo=false displayMessage=true displayRequiredFields=false>
<!DOCTYPE html>
<html class="${properties.kcHtmlClass!}" lang="${lang}"<#if realm.internationalizationEnabled> dir="${(locale.rtl)?then('rtl','ltr')}"</#if>>

<head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <#if properties.meta?has_content>
        <#list properties.meta?split(' ') as meta>
            <meta name="${meta?split('==')[0]}" content="${meta?split('==')[1]}"/>
        </#list>
    </#if>
    <meta name="color-scheme" content="light dark">
    <title>${msg("loginTitle",(realm.displayName!'Recrut'))}</title>
    <link rel="icon" type="image/svg+xml" href="${url.resourcesPath}/img/favicon.svg" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
    <#if properties.stylesCommon?has_content>
        <#list properties.stylesCommon?split(' ') as style>
            <link href="${url.resourcesCommonPath}/${style}" rel="stylesheet" />
        </#list>
    </#if>
    <#if properties.styles?has_content>
        <#list properties.styles?split(' ') as style>
            <link href="${url.resourcesPath}/${style}" rel="stylesheet" />
        </#list>
    </#if>
    <#if properties.scripts?has_content>
        <#list properties.scripts?split(' ') as script>
            <script src="${url.resourcesPath}/${script}" type="text/javascript"></script>
        </#list>
    </#if>
    <script type="importmap">
        {
            "imports": {
                "rfc4648": "${url.resourcesCommonPath}/vendor/rfc4648/rfc4648.js"
            }
        }
    </script>
    <script src="${url.resourcesPath}/js/menu-button-links.js" type="module"></script>
    <#if scripts??>
        <#list scripts as script>
            <script src="${script}" type="text/javascript"></script>
        </#list>
    </#if>
    <script type="module">
        import { startSessionPolling } from "${url.resourcesPath}/js/authChecker.js";
        startSessionPolling("${url.ssoLoginInOtherTabsUrl?no_esc}");
    </script>
    <script type="module">
        document.addEventListener("click", (event) => {
            const link = event.target.closest("a[data-once-link]");
            if (!link) {
                return;
            }
            if (link.getAttribute("aria-disabled") === "true") {
                event.preventDefault();
                return;
            }
            const { disabledClass } = link.dataset;
            if (disabledClass) {
                link.classList.add(...disabledClass.trim().split(/\s+/));
            }
            link.setAttribute("role", "link");
            link.setAttribute("aria-disabled", "true");
        });
    </script>
    <#if authenticationSession??>
        <script type="module">
            import { checkAuthSession } from "${url.resourcesPath}/js/authChecker.js";
            checkAuthSession("${authenticationSession.authSessionIdHash}");
        </script>
    </#if>
</head>

<body class="${properties.kcBodyClass!} ${bodyClass}" data-page-id="login-${pageId}">
<div class="${properties.kcLoginClass!}">

    <aside class="kc-panneau" aria-hidden="true">
        <div class="kc-marque"><@logo taille=34/><span>Recrut</span></div>
        <div class="kc-accroche">
            <p class="kc-accroche-titre">${msg("recrutAccroche")}</p>
            <ul class="kc-points">
                <li><span class="kc-puce"></span>${msg("recrutPoint1")}</li>
                <li><span class="kc-puce"></span>${msg("recrutPoint2")}</li>
                <li><span class="kc-puce"></span>${msg("recrutPoint3")}</li>
            </ul>
        </div>
        <div class="kc-apercu">
            <div class="kc-apercu-tete"><span><small>Shortlist · Atlas Digital</small><b>Développeur Java senior</b></span><em>3 profils</em></div>
            <div class="kc-apercu-ligne"><span class="kc-av">YB</span><span class="kc-nom">Yassine B.<small>Java · 7 ans</small></span><span class="kc-score"><b>92 %</b><i><i style="width:92%"></i></i></span></div>
            <div class="kc-apercu-ligne"><span class="kc-av">RM</span><span class="kc-nom">Rania M.<small>Java · 6 ans</small></span><span class="kc-score"><b>88 %</b><i><i style="width:88%"></i></i></span></div>
        </div>
        <p class="kc-pied-panneau">${msg("recrutPied")}</p>
    </aside>

    <main class="kc-cote">
    <div class="${properties.kcFormCardClass!}">
        <div class="kc-marque kc-marque-mobile"><@logo taille=30/><span>Recrut</span></div>
        <header class="${properties.kcFormHeaderClass!}">
            <#if realm.internationalizationEnabled && locale.supported?size gt 1>
                <div class="${properties.kcLocaleMainClass!}" id="kc-locale">
                    <div id="kc-locale-wrapper" class="${properties.kcLocaleWrapperClass!}">
                        <div id="kc-locale-dropdown" class="menu-button-links ${properties.kcLocaleDropDownClass!}">
                            <button tabindex="1" id="kc-current-locale-link" aria-label="${msg("languages")}" aria-haspopup="true" aria-expanded="false" aria-controls="language-switch1">${locale.current}</button>
                            <ul role="menu" tabindex="-1" aria-labelledby="kc-current-locale-link" aria-activedescendant="" id="language-switch1" class="${properties.kcLocaleListClass!}">
                                <#assign i = 1>
                                <#list locale.supported as l>
                                    <li class="${properties.kcLocaleListItemClass!}" role="none">
                                        <a role="menuitem" id="language-${i}" class="${properties.kcLocaleItemClass!}" href="${l.url}">${l.label}</a>
                                    </li>
                                    <#assign i++>
                                </#list>
                            </ul>
                        </div>
                    </div>
                </div>
            </#if>
            <#if !(auth?has_content && auth.showUsername() && !auth.showResetCredentials())>
                <h1 id="kc-page-title"><#nested "header"></h1>
                <#if pageId == "login" || pageId == "login.ftl"><p class="kc-sous-titre">${msg("recrutSousTitre")}</p></#if>
                <#if displayRequiredFields>
                    <p class="kc-sous-titre"><span class="required">*</span> ${msg("requiredFields")}</p>
                </#if>
            <#else>
                <#nested "show-username">
                <div id="kc-username" class="kc-utilisateur">
                    <label id="kc-attempted-username">${auth.attemptedUsername}</label>
                    <a id="reset-login" href="${url.loginRestartFlowUrl}" aria-label="${msg("restartLoginTooltip")}">${msg("recrutChanger")}</a>
                </div>
            </#if>
        </header>

        <div id="kc-content">
            <div id="kc-content-wrapper">
                <#-- Les actions déclenchées par l'application ne montrent pas l'avertissement « action requise ». -->
                <#if displayMessage && message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
                    <div class="${properties.kcAlertClass!} ${message.type}" role="<#if message.type = 'error'>alert<#else>status</#if>">
                        <span class="${properties.kcAlertTitleClass!}">${kcSanitize(message.summary)?no_esc}</span>
                    </div>
                </#if>

                <#nested "form">

                <#if auth?has_content && auth.showTryAnotherWayLink()>
                    <form id="kc-select-try-another-way-form" action="${url.loginAction}" method="post">
                        <div class="${properties.kcFormGroupClass!}">
                            <input type="hidden" name="tryAnotherWay" value="on"/>
                            <a href="#" id="try-another-way"
                               onclick="document.forms['kc-select-try-another-way-form'].requestSubmit();return false;">${msg("doTryAnotherWay")}</a>
                        </div>
                    </form>
                </#if>

                <#nested "socialProviders">

                <#if displayInfo>
                    <div id="kc-info" class="${properties.kcSignUpClass!}">
                        <div id="kc-info-wrapper" class="${properties.kcInfoAreaWrapperClass!}">
                            <#nested "info">
                        </div>
                    </div>
                </#if>
            </div>
        </div>

        <@loginFooter.content/>
    </div>
    </main>
</div>
</body>
</html>
</#macro>
