import requests
import json
import sys

def test_recall(query):
    url = "http://localhost:11451/api/graph/search"
    payload = {
        "query": query,
        "max_hops": 1 # 只看种子节点和直接关联，方便分析打分
    }
    
    try:
        response = requests.post(url, json=payload)
        if response.status_code == 200:
            data = response.json()
            nodes = data.get('nodes', [])
            
            print(f"\n🔍 Query: '{query}'")
            print(f"📊 Found {len(nodes)} nodes in recall set.\n")
            
            # 排序：按 Hop 级别（种子节点 Hop=0）
            seeds = [n for n in nodes if n.get('hop_level') == 0]
            
            print("--- Top Seed Nodes (Entry Points) ---")
            for i, node in enumerate(seeds[:10]):
                print(f"{i+1}. [{node['name']}] (Type: {node['type']}, Community: {node['community_id']})")
                # print(f"   Description: {node['description'][:80]}...")
            
            print("\n--- Discovery Path ---")
            # 简单展示一条关系路径
            edges = data.get('edges', [])
            if edges:
                e = edges[0]
                # 寻找对应的节点名
                name_map = {n['id']: n['name'] for n in nodes}
                src = name_map.get(e['source_id'], "Unknown")
                dst = name_map.get(e['target_id'], "Unknown")
                print(f"Sample Edge: {src} --[{e['relation_type']}]--> {dst}")
                
        else:
            print(f"Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    test_q = sys.argv[1] if len(sys.argv) > 1 else "React 19"
    test_recall(test_q)
