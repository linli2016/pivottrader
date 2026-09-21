"""
Taxonomy definitions and mappings for KovaView / IBD 30 Tactical Sectors.
"""

from typing import Dict, List

TACTICAL_SECTORS: List[str] = [
    "Software",
    "Chips",
    "Computer",
    "Electrncs",
    "Internet",
    "Telecom",
    "Media",
    "Medical",
    "Banks",
    "Insurance",
    "Finance",
    "Real Est",
    "Building",
    "Transportation",
    "Auto",
    "Aerospace/Defense",
    "Machine",
    "Busins Svc",
    "Energy",
    "Utility",
    "Mining",
    "Metals",
    "Chemical",
    "Agriculture",
    "Retail",
    "Food/Bev",
    "Leisure",
    "Consumer",
    "Alcohl/Tob/Thc",
    "Misc"
]

INDUSTRY_TO_TACTICAL_SECTOR: Dict[str, str] = {
    # 1. Software
    "Computer Software: Prepackaged Software": "Software",
    "Computer Software: Programming Data Processing": "Software",
    "EDP Services": "Software",
    "Retail: Computer Software & Peripheral Equipment": "Software",
    "Software ETF": "Software",

    # 2. Chips
    "Semiconductors": "Chips",
    "Semiconductors ETF": "Chips",

    # 3. Computer
    "Computer Manufacturing": "Computer",
    "Computer peripheral equipment": "Computer",
    "Computer Communications Equipment": "Computer",

    # 4. Electrncs
    "Electronic Components": "Electrncs",
    "Electronics Distribution": "Electrncs",
    "Consumer Electronics/Appliances": "Electrncs",
    "Consumer Electronics/Video Chains": "Electrncs",
    "Electrical Products": "Electrncs",
    "Precision Instruments": "Electrncs",
    "Medical Electronics": "Electrncs",

    # 5. Internet
    "Advertising": "Internet",
    "Catalog/Specialty Distribution": "Internet",

    # 6. Telecom
    "Telecommunications Equipment": "Telecom",
    "Radio And Television Broadcasting And Communications Equipment": "Telecom",
    "Communication Services ETF": "Telecom",

    # 7. Media
    "Broadcasting": "Media",
    "Cable & Other Pay Television Services": "Media",
    "Movies/Entertainment": "Media",
    "Newspapers/Magazines": "Media",
    "Publishing": "Media",
    "Books": "Media",

    # 8. Medical
    "Biotechnology: Pharmaceutical Preparations": "Medical",
    "Biotechnology: Biological Products (No Diagnostic Substances)": "Medical",
    "Biotechnology: In Vitro & In Vivo Diagnostic Substances": "Medical",
    "Biotechnology: Commercial Physical & Biological Resarch": "Medical",
    "Biotechnology: Electromedical & Electrotherapeutic Apparatus": "Medical",
    "Biotechnology: Laboratory Analytical Instruments": "Medical",
    "Medical/Dental Instruments": "Medical",
    "Medical Specialities": "Medical",
    "Medical/Nursing Services": "Medical",
    "Hospital/Nursing Management": "Medical",
    "Managed Health Care": "Medical",
    "Other Pharmaceuticals": "Medical",
    "Pharmaceuticals and Biotechnology": "Medical",
    "Biotech ETF": "Medical",
    "Health Care ETF": "Medical",
    "Medicinal Chemicals and Botanical Products": "Medical",
    "Misc Health and Biotechnology Services": "Medical",
    "Ophthalmic Goods": "Medical",

    # 9. Banks
    "Major Banks": "Banks",
    "Commercial Banks": "Banks",
    "Banks": "Banks",
    "Savings Institutions": "Banks",
    "Regional Banking ETF": "Banks",

    # 10. Insurance
    "Property-Casualty Insurers": "Insurance",
    "Life Insurance": "Insurance",
    "Specialty Insurers": "Insurance",
    "Accident &Health Insurance": "Insurance",

    # 11. Finance
    "Finance: Consumer Services": "Finance",
    "Investment Managers": "Finance",
    "Investment Bankers/Brokers/Service": "Finance",
    "Finance Companies": "Finance",
    "Finance/Investors Services": "Finance",
    "Diversified Financial Services": "Finance",
    "Financials ETF": "Finance",
    "Trusts Except Educational Religious and Charitable": "Finance",
    "Blank Checks": "Finance",

    # 12. Real Est
    "Real Estate Investment Trusts": "Real Est",
    "Real Estate": "Real Est",
    "Building operators": "Real Est",
    "Real Estate ETF": "Real Est",

    # 13. Building
    "Homebuilding": "Building",
    "Building Materials": "Building",
    "Building Products": "Building",
    "General Bldg Contractors - Nonresidential Bldgs": "Building",
    "Engineering & Construction": "Building",
    "RETAIL: Building Materials": "Building",
    "Homebuilders ETF": "Building",
    "Water Sewer Pipeline Comm & Power Line Construction": "Building",
    "Forest Products": "Building",

    # 14. Transportation
    "Marine Transportation": "Transportation",
    "Air Freight/Delivery Services": "Transportation",
    "Trucking Freight/Courier Services": "Transportation",
    "Railroads": "Transportation",
    "Integrated Freight & Logistics": "Transportation",
    "Transportation Services": "Transportation",
    "Other Transportation": "Transportation",

    # 15. Auto
    "Auto Manufacturing": "Auto",
    "Auto Parts:O.E.M.": "Auto",
    "Automotive Aftermarket": "Auto",
    "Auto & Home Supply Stores": "Auto",
    "Retail-Auto Dealers and Gas Stations": "Auto",
    "Motor Vehicles": "Auto",

    # 16. Aerospace/Defense
    "Aerospace": "Aerospace/Defense",
    "Military/Government/Technical": "Aerospace/Defense",
    "Ordnance And Accessories": "Aerospace/Defense",
    "Aerospace & Defense ETF": "Aerospace/Defense",

    # 17. Machine
    "Industrial Machinery/Components": "Machine",
    "Construction/Ag Equipment/Trucks": "Machine",
    "Fluid Controls": "Machine",
    "Tools/Hardware": "Machine",
    "Industrial Specialties": "Machine",
    "Metal Fabrications": "Machine",
    "Pollution Control Equipment": "Machine",

    # 18. Busins Svc
    "Business Services": "Busins Svc",
    "Professional Services": "Busins Svc",
    "Diversified Commercial Services": "Busins Svc",
    "Environmental Services": "Busins Svc",
    "Rental/Leasing Companies": "Busins Svc",
    "Misc Corporate Leasing Services": "Busins Svc",
    "Professional and commerical equipment": "Busins Svc",

    # 19. Energy
    "Oil & Gas Production": "Energy",
    "Oilfield Services/Equipment": "Energy",
    "Oil and Gas Field Machinery": "Energy",
    "Integrated oil Companies": "Energy",
    "Oil/Gas Transmission": "Energy",
    "Oil Refining/Marketing": "Energy",
    "Natural Gas Distribution": "Energy",
    "Coal Mining": "Energy",
    "Energy ETF": "Energy",
    "Oil & Gas ETF": "Energy",

    # 20. Utility
    "Electric Utilities: Central": "Utility",
    "Power Generation": "Utility",
    "Water Supply": "Utility",
    "Utilities ETF": "Utility",

    # 21. Mining
    "Metal Mining": "Mining",
    "Mining & Quarrying of Nonmetallic Minerals (No Fuels)": "Mining",
    "Other Metals and Minerals": "Mining",

    # 22. Metals
    "Precious Metals": "Metals",
    "Steel/Iron Ore": "Metals",
    "Aluminum": "Metals",

    # 23. Chemical
    "Major Chemicals": "Chemical",
    "Specialty Chemicals": "Chemical",
    "Agricultural Chemicals": "Chemical",
    "Paints/Coatings": "Chemical",
    "Plastic Products": "Chemical",

    # 24. Agriculture
    "Farming/Seeds/Milling": "Agriculture",

    # 25. Retail
    "Department/Specialty Retail Stores": "Retail",
    "Clothing/Shoe/Accessory Stores": "Retail",
    "Other Specialty Stores": "Retail",
    "Retail-Drug Stores and Proprietary Stores": "Retail",
    "Wholesale Distributors": "Retail",
    "Retail ETF": "Retail",

    # 26. Food/Bev
    "Beverages (Production/Distribution)": "Food/Bev",
    "Packaged Foods": "Food/Bev",
    "Food Chains": "Food/Bev",
    "Food Distributors": "Food/Bev",
    "Specialty Foods": "Food/Bev",
    "Meat/Poultry/Fish": "Food/Bev",

    # 27. Leisure
    "Hotels/Resorts": "Leisure",
    "Restaurants": "Leisure",
    "Services-Misc. Amusement & Recreation": "Leisure",
    "Recreational Games/Products/Toys": "Leisure",

    # 28. Consumer
    "Apparel": "Consumer",
    "Home Furnishings": "Consumer",
    "Package Goods/Cosmetics": "Consumer",
    "Shoe Manufacturing": "Consumer",
    "Other Consumer Services": "Consumer",
    "Consumer Specialties": "Consumer",
    "Containers/Packaging": "Consumer",
    "Paper": "Consumer",
    "Textiles": "Consumer",
    "Garments and Clothing": "Consumer",
    "Durable Goods": "Consumer",
    "Consumer Discretionary ETF": "Consumer",
    "Consumer Staples ETF": "Consumer",

    # 29. Alcohl/Tob/Thc
    "Tobacco": "Alcohl/Tob/Thc",

    # 30. Misc
    "Miscellaneous": "Misc",
    "Miscellaneous manufacturing industries": "Misc",
    "Multi-Sector Companies": "Misc",
    "Office Equipment/Supplies/Services": "Misc",
    "Basic Materials ETF": "Misc",
    "Industrials ETF": "Misc",
    "Market Index": "Misc",
    "Nasdaq 100 ETF": "Misc",
    "S&P 500 ETF": "Misc",
    "Small Cap ETF": "Misc",
    "Technology ETF": "Misc"
}

def get_tactical_sector(industry: str, default: str = "Misc") -> str:
    """Returns the KovaView 30 tactical sector for a given industry."""
    if not industry:
        return default
    ind_clean = industry.strip()
    return INDUSTRY_TO_TACTICAL_SECTOR.get(ind_clean, default)

