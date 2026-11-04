-- Lembretes ligados por defeito: quem já fez o onboarding e nunca teve preferências passa a receber o lembrete de estudo por e-mail
-- (cada e-mail traz a ligação para cancelar, e o perfil tem o interruptor). Quem já escolheu antes, ligado ou desligado, fica como está.
INSERT INTO notification_prefs (user_id, email_enabled, push_enabled, categories, unsubscribe_token, study_hour)
SELECT sp.user_id, true, false, '{"study": true, "summary": true, "promo": false}'::jsonb,
       md5(random()::text || clock_timestamp()::text || sp.user_id) || md5(clock_timestamp()::text || random()::text), 18
FROM student_profiles sp
WHERE sp.onboarded_at IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM notification_prefs n WHERE n.user_id = sp.user_id)
ON CONFLICT (user_id) DO NOTHING;
