<#ftl output_format="plainText">
<#assign invitation = (user.attributes.invitePar)??>
${msg(invitation?then("recrutInvitationTexte", "recrutActionsTexte"), (user.firstName)!"")}

${link}

${msg("recrutActionsValidite", linkExpirationFormatter(linkExpiration))}
