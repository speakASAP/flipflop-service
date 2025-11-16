-- Clean HTML tags from product descriptions
-- This script removes all HTML tags and keeps only plain text
-- Run on production: ssh statex "cd database-server && docker exec -i db-server-postgres psql -U dbadmin -d ecommerce" < scripts/clean-product-descriptions.sql

-- Function to strip HTML tags (PostgreSQL version)
CREATE OR REPLACE FUNCTION strip_html_tags(html_text TEXT)
RETURNS TEXT AS $$
DECLARE
  cleaned_text TEXT;
BEGIN
  IF html_text IS NULL OR html_text = '' THEN
    RETURN '';
  END IF;
  
  cleaned_text := html_text;
  
  -- Remove HTML comments
  cleaned_text := regexp_replace(cleaned_text, '<!--.*?-->', '', 'gs');
  
  -- Remove script and style tags with their content
  cleaned_text := regexp_replace(cleaned_text, '<script.*?</script>', '', 'gis');
  cleaned_text := regexp_replace(cleaned_text, '<style.*?</style>', '', 'gis');
  
  -- Replace common HTML entities
  cleaned_text := regexp_replace(cleaned_text, '&nbsp;', ' ', 'g');
  cleaned_text := regexp_replace(cleaned_text, '&amp;', '&', 'g');
  cleaned_text := regexp_replace(cleaned_text, '&lt;', '<', 'g');
  cleaned_text := regexp_replace(cleaned_text, '&gt;', '>', 'g');
  cleaned_text := regexp_replace(cleaned_text, '&quot;', '"', 'g');
  cleaned_text := regexp_replace(cleaned_text, '&#39;', '''', 'g');
  cleaned_text := regexp_replace(cleaned_text, '&apos;', '''', 'g');
  
  -- Remove all HTML tags
  cleaned_text := regexp_replace(cleaned_text, '<[^>]+>', '', 'g');
  
  -- Decode numeric HTML entities (basic)
  -- Note: Full entity decoding would require a more complex function
  -- This handles the most common cases
  
  -- Clean up whitespace (multiple spaces to single space)
  cleaned_text := regexp_replace(cleaned_text, '\s+', ' ', 'g');
  
  -- Trim
  cleaned_text := trim(cleaned_text);
  
  RETURN cleaned_text;
END;
$$ LANGUAGE plpgsql;

-- Update all product descriptions
UPDATE products
SET 
  description = CASE 
    WHEN description IS NOT NULL AND description != '' THEN strip_html_tags(description)
    ELSE NULL
  END,
  "shortDescription" = CASE 
    WHEN "shortDescription" IS NOT NULL AND "shortDescription" != '' THEN strip_html_tags("shortDescription")
    ELSE NULL
  END,
  "seoDescription" = CASE 
    WHEN "seoDescription" IS NOT NULL AND "seoDescription" != '' THEN strip_html_tags("seoDescription")
    ELSE NULL
  END,
  "updatedAt" = NOW()
WHERE 
  (description IS NOT NULL AND description != '' AND description ~ '<[^>]+>')
  OR ("shortDescription" IS NOT NULL AND "shortDescription" != '' AND "shortDescription" ~ '<[^>]+>')
  OR ("seoDescription" IS NOT NULL AND "seoDescription" != '' AND "seoDescription" ~ '<[^>]+>');

-- Show summary
SELECT 
  COUNT(*) as total_products,
  COUNT(CASE WHEN description IS NOT NULL THEN 1 END) as products_with_description,
  COUNT(CASE WHEN "shortDescription" IS NOT NULL THEN 1 END) as products_with_short_description
FROM products;

-- Drop the temporary function (optional - you can keep it for future use)
-- DROP FUNCTION IF EXISTS strip_html_tags(TEXT);

