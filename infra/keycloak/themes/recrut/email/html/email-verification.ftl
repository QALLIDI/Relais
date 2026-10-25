<#-- E-mail d'activation d'après la maquette « EmberActivationMail ». Styles en ligne : les messageries ignorent les feuilles de style. -->
<#assign tel = (user.attributes.telephone)!"">
<#assign entreprise = ((user.attributes.typeCompte)!"") == "ENTREPRISE">
<#assign typeLibelle = entreprise?then(msg("recrutEntreprise"), msg("recrutCandidat"))>
<#assign prefixe = entreprise?then("recrutEtapeEntreprise", "recrutEtapeCandidat")>
<html lang="${locale.language}">
<body style="margin:0;padding:0;background:#F4F4F2;font-family:'Outfit',system-ui,-apple-system,'Segoe UI',sans-serif;color:#17181C">
<div style="max-width:560px;margin:0 auto;padding:32px 16px">
  <div style="font-weight:600;font-size:18px;margin-bottom:16px">
    <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#E8622A;vertical-align:middle"></span>
    <span style="vertical-align:middle">&nbsp;Recrut</span>
  </div>

  <div style="background:#E8622A;background-image:linear-gradient(160deg,#F28A4E 0%,#E8622A 50%,#C9441A 100%);color:#FFFFFF;border-radius:24px;padding:28px">
    <div style="font-size:14px;opacity:0.9">${msg("recrutBienvenue", (user.firstName)!"")}</div>
    <div style="font-size:30px;line-height:1.15;margin-top:6px">${msg("recrutTitre")}</div>
  </div>

  <div style="background:#FFFFFF;border-radius:24px;padding:26px;margin-top:16px">
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#4A4B50">
      <#if (tel?length > 2)>
        ${kcSanitize(msg("recrutNumeroVerifie", tel[tel?length-2..], typeLibelle))?no_esc}
      <#else>
        ${msg("recrutConfirmez", typeLibelle)}
      </#if>
    </p>
    <a href="${link}" style="display:block;text-align:center;padding:16px;border-radius:999px;background:#17181C;color:#FFFFFF;text-decoration:none;font-size:16px">${msg("recrutBouton")}</a>
    <div style="background:#F4F4F2;border-radius:16px;padding:12px 14px;font-size:13px;color:#4A4B50;margin-top:16px">
      ${msg("recrutValidite", linkExpirationFormatter(linkExpiration))}
    </div>
    <p style="margin:16px 0 0;font-size:12px;color:#5E6066;word-break:break-all">${msg("recrutLienTexte")} ${link}</p>
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:16px;border-collapse:separate;border-spacing:10px 0">
    <tr>
      <#list 1..3 as n>
      <td style="background:#FFFFFF;border-radius:20px;padding:14px;vertical-align:top;width:33%">
        <div style="font-size:22px;font-weight:500">${n}</div>
        <div style="font-size:12px;color:#5E6066">${msg(prefixe + n)}</div>
      </td>
      </#list>
    </tr>
  </table>

  <p style="margin:20px 0 0;font-size:11px;color:#9A9BA0;text-align:center">${msg("recrutPied", realmName)}</p>
</div>
</body>
</html>
