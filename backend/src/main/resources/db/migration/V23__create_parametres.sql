-- Platform configuration parameters (revenue split and future settings).
-- Extensible key/value store: every platform setting lives here, no per-setting
-- columns. The revenue split is read server-side by ParametreService; the app
-- never hard-codes these percentages.
CREATE TABLE IF NOT EXISTS parametres (
    id BIGSERIAL PRIMARY KEY,
    parametre_key VARCHAR(100) NOT NULL UNIQUE,
    parametre_value VARCHAR(255) NOT NULL,
    description VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO parametres (parametre_key, parametre_value, description)
VALUES
    ('platform_percentage', '20', 'Pourcentage de chaque vente payee reverse a la plateforme.'),
    ('instructor_percentage', '80', 'Pourcentage de chaque vente payee reverse a l''instructeur.');