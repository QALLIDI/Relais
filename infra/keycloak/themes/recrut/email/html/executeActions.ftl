<#-- Actions requises (design Épuré). Sert surtout à l'invitation d'un membre d'équipe entreprise
     (attribut invitePar) ; sinon, texte générique « mettez à jour votre compte ». -->
<#assign invitation = (user.attributes.invitePar)??>
<html lang="${locale.language}">
<body style="margin:0;padding:0;background:#F4F6F9;font-family:Inter,'Segoe UI',Arial,sans-serif;color:#17181C">
<div style="max-width:560px;margin:0 auto;padding:28px 16px">
  <div style="font-weight:600;font-size:16px;margin-bottom:14px">
    <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#E8622A;vertical-align:middle"></span>
    <span style="vertical-align:middle">&nbsp;Recrut</span>
  </div>
  <div style="background:#FFFFFF;border:1px solid #ECEEF1;border-radius:16px;padding:28px">
    <div style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#6B6C71">${msg(invitation?then("recrutInvitationSurtitre", "recrutActionsSurtitre"))}</div>
    <div style="font-size:22px;line-height:1.25;font-weight:500;margin:8px 0 14px">${msg(invitation?then("recrutInvitationTitre", "recrutActionsTitre"))}</div>
    <p style="margin:0 0 18px;font-size:14.5px;line-height:1.6;color:#3E3F44">${msg(invitation?then("recrutInvitationTexte", "recrutActionsTexte"), (user.firstName)!"")}</p>
    <a href="${link}" style="display:inline-block;padding:13px 24px;border-radius:999px;background:#D3E6FB;color:#164A7E;text-decoration:none;font-size:15px;font-weight:600">${msg(invitation?then("recrutInvitationBouton", "recrutActionsBouton"))}</a>
    <p style="margin:18px 0 0;font-size:12.5px;line-height:1.5;color:#6B6C71">${msg("recrutActionsValidite", linkExpirationFormatter(linkExpiration))}</p>
    <p style="margin:10px 0 0;font-size:12px;color:#6B6C71;word-break:break-all">${msg("recrutLienTexte")} ${link}</p>
  </div>
  <p style="margin:18px 0 0;font-size:11.5px;color:#6B6C71;text-align:center">${msg("recrutResetPied", realmName)}</p>
</div>
</body>
</html>
