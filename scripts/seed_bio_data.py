import sqlite3
import datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
db_path = REPO_ROOT / "apps/backend/blog_platform.db"

cases = [
    {
        "title": "Spider Silk: Nature's High-Performance Fiber",
        "content": "Spider silk is a protein-based fiber that is five times stronger than steel by weight and three times tougher than Kevlar. It is composed of amino acids like glycine and alanine. The complex mechanical properties result from its semi-crystalline structure, where amorphous regions provide elasticity and crystalline regions provide strength. This enables spiders to capture prey without the web breaking under dynamic loads."
    },
    {
        "title": "Stenocara Beetle: Water Collection in the Desert",
        "content": "The Stenocara beetle of the Namib Desert survives by collecting water from morning fog using its shell. Its back is covered with small bumps that have hydrophilic (water-attracting) tips and hydrophobic (water-repelling) sides. This configuration allows water droplets to condense on the tips, grow in size, and then roll off the slippery sides directly into the beetle's mouth, providing a blueprint for passive moisture harvesting systems in arid regions."
    },
    {
        "title": "Gecko Adhesion: Reversible Dry Adhesive",
        "content": "Geckos can climb smooth vertical surfaces thanks to millions of microscopic hairs called setae on their toe pads. Each seta branches into hundreds of even smaller spatulae. These hierarchical structures create immense surface area contact, enabling van der Waals forces to provide strong attachment. The adhesion is reversible through a change in the angle of the hairs, allowing the gecko to detach and re-attach with minimal effort."
    },
    {
        "title": "Lotus Effect: Self-Cleaning Surfaces",
        "content": "Lotus leaves remain clean despite growing in muddy water due to their micro and nanostructured surface. The surface is covered with wax crystals that minimize the contact area with water droplets. This leads to extremely high contact angles (superhydrophobicity), causing water to roll off easily and take dust and contaminants with it. This passive self-cleaning mechanism is widely emulated in paints and coatings."
    },
    {
        "title": "Kingfisher Beak: Aerodynamic Efficiency",
        "content": "When a kingfisher dives into water, its specialized wedge-shaped beak allows it to do so with minimal splash or pressure change. This transition from low-density air to high-density water is highly efficient due to the beak's geometry. Engineers used this principle to redesign the nose of Shinkansen bullet trains, successfully reducing the 'tunnel boom' (sonic boom) produced when exiting tunnels and improving energy efficiency by 15%."
    }
]

def insert_cases():
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    now = datetime.datetime.now().isoformat()
    
    for case in cases:
        try:
            cursor.execute("""
                INSERT INTO blog_post (title, content, status, updated_at, created_at, slug, author_id)
                VALUES (?, ?, 'PUBLISHED', ?, ?, ?, 1)
            """, (case['title'], case['content'], now, now, case['title'].lower().replace(" ", "-")))
            print(f"Inserted: {case['title']}")
        except Exception as e:
            print(f"Failed to insert {case['title']}: {e}")
            
    conn.commit()
    conn.close()

if __name__ == "__main__":
    insert_cases()
