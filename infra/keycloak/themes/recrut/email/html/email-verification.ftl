<#-- E-mail d'activation (design Épuré) : fond neutre, carte blanche, un seul bouton bleu clair ; l'orange n'apparaît que dans le logo.
     Styles en ligne : les messageries ignorent les feuilles de style. -->
<#assign tel = (user.attributes.telephone)!"">
<#assign entreprise = ((user.attributes.typeCompte)!"") == "ENTREPRISE">
<#assign typeLibelle = entreprise?then(msg("recrutEntreprise"), msg("recrutCandidat"))>
<#assign prefixe = entreprise?then("recrutEtapeEntreprise", "recrutEtapeCandidat")>
<html lang="${locale.language}">
<body style="margin:0;padding:0;background:#F4F6F9;font-family:Inter,'Segoe UI',Arial,sans-serif;color:#17181C">
<div style="max-width:560px;margin:0 auto;padding:28px 16px">
  <div style="font-weight:600;font-size:16px;margin-bottom:14px">
    <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#E8622A;vertical-align:middle"></span>
    <span style="vertical-align:middle">&nbsp;Recrut</span>
  </div>

  <div style="background:#FFFFFF;border:1px solid #ECEEF1;border-radius:16px;padding:28px">
    <div style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#6B6C71">${msg("recrutBienvenue", (user.firstName)!"")}</div>
    <div style="font-size:22px;line-height:1.25;font-weight:500;margin:8px 0 14px">${msg("recrutTitre")}</div>
    <p style="margin:0 0 18px;font-size:14.5px;line-height:1.6;color:#3E3F44">
      <#if (tel?length > 2)>
        ${kcSanitize(msg("recrutNumeroVerifie", tel[tel?length-2..], typeLibelle))?no_esc}
      <#else>
        ${msg("recrutConfirmez", typeLibelle)}
      </#if>
    </p>
    <a href="${link}" style="display:inline-block;padding:13px 24px;border-radius:999px;background:#D3E6FB;color:#164A7E;text-decoration:none;font-size:15px;font-weight:600">${msg("recrutBouton")}</a>
    <p style="margin:18px 0 0;font-size:12.5px;line-height:1.5;color:#6B6C71">${msg("recrutValidite", linkExpirationFormatter(linkExpiration))}</p>
    <p style="margin:10px 0 0;font-size:12px;color:#6B6C71;word-break:break-all">${msg("recrutLienTexte")} ${link}</p>
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:14px;border-collapse:separate;border-spacing:8px 0">
    <tr>
      <#list 1..3 as n>
      <td style="background:#FFFFFF;border:1px solid #ECEEF1;border-radius:14px;padding:12px;vertical-align:top;width:33%">
        <div style="font-size:13px;font-weight:500">${n}.</div>
        <div style="font-size:12px;color:#6B6C71;line-height:1.4">${msg(prefixe + n)}</div>
      </td>
      </#list>
    </tr>
  </table>

  <p style="margin:18px 0 0;font-size:11.5px;color:#6B6C71;text-align:center">${msg("recrutPied", realmName)}</p>
</div>
</body>
</html>
