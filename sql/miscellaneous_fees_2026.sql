-- =====================================================
-- MISCELLANEOUS FEES 2026 - SETUP SCRIPT
-- Description: Creates normalized structure with fee categories
--              and miscellaneous fee items
-- Date: 2026-03-04
-- =====================================================

-- Step 1: Create fee_category table (stores titles like "Miscellaneous 2026")
CREATE TABLE IF NOT EXISTS fee_category (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    academic_year VARCHAR(20) NOT NULL,
    category_type VARCHAR(50) NOT NULL DEFAULT 'miscellaneous',
    status VARCHAR(10) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_fee_category_status CHECK (status IN ('active', 'inactive')),
    CONSTRAINT uq_fee_category_year_type UNIQUE(academic_year, category_type)
);

-- Step 2: Create miscellaneous_fees table (linked to fee_category)
CREATE TABLE IF NOT EXISTS miscellaneous_fees (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL,
    item VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(10) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_miscellaneous_fee_amount CHECK (amount >= 0),
    CONSTRAINT chk_miscellaneous_fee_status CHECK (status IN ('active', 'inactive')),
    CONSTRAINT fk_miscellaneous_fee_category FOREIGN KEY (category_id) 
        REFERENCES fee_category(id) ON DELETE CASCADE
);

-- Step 3: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_fee_category_year_type 
ON fee_category(academic_year, category_type);

CREATE INDEX IF NOT EXISTS idx_fee_category_status 
ON fee_category(status);

CREATE INDEX IF NOT EXISTS idx_miscellaneous_fee_category 
ON miscellaneous_fees(category_id);

CREATE INDEX IF NOT EXISTS idx_miscellaneous_fee_status 
ON miscellaneous_fees(status);

-- Step 4: Insert fee category title "Miscellaneous 2026"
INSERT INTO fee_category (title, description, academic_year, category_type, status)
VALUES 
    ('Miscellaneous 2026', 'Miscellaneous fees for academic year 2026', '2026', 'miscellaneous', 'active')
ON CONFLICT (academic_year, category_type) DO NOTHING;

-- Step 5: Insert MISCELLANEOUS FEES items linked to the category
INSERT INTO miscellaneous_fees (category_id, item, amount, status)
SELECT 
    fc.id,
    fee_item.item,
    fee_item.amount,
    'active'
FROM fee_category fc
CROSS JOIN (
    VALUES 
        ('Athletic & Sports Fee', 2000.00),
        ('Cultural Fee', 3000.00),
        ('Development Fee', 0.00),
        ('Guidance Fee', 0.00),
        ('Library Fee', 0.00),
        ('Medical & Dental', 0.00),
        ('Registration', 0.00),
        ('Student Council Fee', 0.00),
        ('Student Welfare', 0.00)
) AS fee_item(item, amount)
WHERE fc.academic_year = '2026' AND fc.category_type = 'miscellaneous'
ON CONFLICT DO NOTHING;

-- Step 6: Add triggers to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_fee_category_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_fee_category_updated_at
    BEFORE UPDATE ON fee_category
    FOR EACH ROW
    EXECUTE FUNCTION update_fee_category_updated_at();
CREATE OR REPLACE FUNCTION update_miscellaneous_fees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_miscellaneous_fees_updated_at
    BEFORE UPDATE ON miscellaneous_fees
    FOR EACH ROW
    EXECUTE FUNCTION update_miscellaneous_fees_updated_at();

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check fee category
SELECT 
    '=== FEE CATEGORY ===' AS section;

SELECT 
    id,
    title AS "TITLE",
    description AS "DESCRIPTION",
    academic_year AS "YEAR",
    category_type AS "TYPE",
    status AS "STATUS"
FROM fee_category
WHERE academic_year = '2026';

-- Check miscellaneous fees with category title
SELECT 
    '=== MISCELLANEOUS FEES WITH TITLE ===' AS section;

SELECT 
    fc.title AS "CATEGORY TITLE",
    mf.item AS "ITEM",
    CONCAT('₱', TO_CHAR(mf.amount, 'FM999,999,990.00')) AS "AMOUNT",
    mf.status AS "STATUS"
FROM miscellaneous_fees mf
JOIN fee_category fc ON mf.category_id = fc.id
WHERE fc.academic_year = '2026'
ORDER BY mf.id;

-- Summary
SELECT 
    '=== SUMMARY ===' AS section;

SELECT 
    fc.title AS "Category",
    CONCAT('Total Items: ', COUNT(mf.id)) AS "Count",
    CONCAT('Total Amount: ₱', TO_CHAR(SUM(mf.amount), 'FM999,999,990.00')) AS "Total"
FROM fee_category fc
LEFT JOIN miscellaneous_fees mf ON fc.id = mf.category_id AND mf.status = 'active'
WHERE fc.academic_year = '2026'
GROUP BY fc.id, fc.title;

-- =====================================================
-- Expected Output:
-- === FEE CATEGORY ===
-- TITLE                    DESCRIPTION                              YEAR    TYPE            STATUS
-- ----------------------------------------------------------------------------------------------------
-- Miscellaneous 2026      Miscellaneous fees for academic year...  2026    miscellaneous   active
--
-- === MISCELLANEOUS FEES WITH TITLE ===
-- CATEGORY TITLE          ITEM                          AMOUNT          STATUS
-- ---------------------------------------------------------------------------------
-- Miscellaneous 2026      Athletic & Sports Fee         ₱2,000.00      active
-- Miscellaneous 2026      Cultural Fee                  ₱3,000.00      active
-- Miscellaneous 2026      Development Fee              ₱0.00           active
-- Miscellaneous 2026      Guidance Fee                 ₱0.00           active
-- Miscellaneous 2026      Library Fee                  ₱0.00           active
-- Miscellaneous 2026      Medical & Dental             ₱0.00           active
-- Miscellaneous 2026      Registration                 ₱0.00           active
-- Miscellaneous 2026      Student Council Fee          ₱0.00           active
-- Miscellaneous 2026      Student Welfare              ₱0.00           active
--
-- === SUMMARY ===
-- Category               Count           Total
-- -------------------------------------------------
-- Miscellaneous 2026     Total Items: 9  Total Amount: ₱5,000.00
--
-- NOTE: The title "Miscellaneous 2026" is now stored in the fee_category table.
-- This allows dynamic titles for different years and easy customization.
-- =====================================================
