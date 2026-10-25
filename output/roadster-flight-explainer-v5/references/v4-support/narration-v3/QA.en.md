# v3 measured narration QA

Sixteen exact WAV files were verified against their synthesis hashes and recognized with the already-cached offline faster-whisper small model. No recognition prompt containing the expected script was supplied, and no model download or paid API was used.

Recognition elapsed: 88.8 seconds. No three-character deletion flags were raised in the isolated clip comparisons. Several isolated windows have homophonic and simplified/traditional substitutions; these are not treated as proven pronunciation defects. Full mixed-master recognition is still required once that exact master exists.

| Clip | Expected | Recognition |
|---|---|---|
| L01 | 比墙还陡，它怎么掉不下来？ | 比墙还陡 它怎么调不下来 |
| L02 | 风扇抽走车底缝隙里的空气， | 风扇抽走车底缝隙里的空气。 |
| L03 | 外面的空气，就把它压在坡上。 | 外面的空气就把它压在坡上。 |
| L04 | 说是吸，其实是压。 | 说是西 其实是雅 |
| L05 | 压紧了，轮胎才抓得住。 | 压紧了,轮胎才抓得住。 |
| L06 | 这股力始终压向坡面，哪怕是往上。 | 这鼓励始终压向泼面, 哪怕是网上。 |
| L07 | 可坡总有尽头。 | 可迫总有劲头。 |
| L08 | 车底下没了坡，就压不住了。 | 彻底下没了坡就压不住了 |
| L09 | 腾空以后，换自带的高压气接力。 | 腾空以后,换字带的高压起接力。 |
| L10 | 气往下喷，车就被往上推。 | 气往下喷,车就被往上推。 |
| L11a | 另一场演示里， | 另一場演示禮 |
| L11b | 推力偏离重心， | 推力偏離腫心 |
| L11c | 它整个翻了过来。 | 它整个翻了过来 |
| L12 | 贴着坡，借的是空气的力； | 貼著坡 借的是空氣的力 |
| L13 | 腾了空，花的是自己的气。 | 疼了空 花的是自己的气 |
| L14 | 自己的气，总有喷完的时候。 | 自己的气总有喷完的时候 |

The scripts and exact engine word-boundary timing verify file integrity and timing. Recognition does not prove tone, subjective voice quality or listening comfort. Subjective listening and physical-phone review have not been performed.
